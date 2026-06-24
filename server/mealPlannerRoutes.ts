import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import { isAuthenticated } from "./replitAuth";
import { storage } from "./storage";
import { getUserFamilyRole } from "./permissions";
import { sendEmail } from "./emailService";
import { z } from "zod";
import { insertMealPlanSchema, type MealPlan, type MealPlanDay, type GroceryCategory } from "@shared/schema";

// Strict validation of the AI-generated plan structure before persistence.
const aiMealSchema = z.object({
  mealType: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  ingredients: z.array(z.string()),
  steps: z.array(z.string()),
});
const aiDaySchema = z.object({
  day: z.string().min(1),
  meals: z.array(aiMealSchema).min(1),
});
const aiDaysSchema = z.array(aiDaySchema).min(1);
const aiGrocerySchema = z.array(z.object({
  category: z.string().min(1),
  items: z.array(z.string()),
}));

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const SYSTEM_PROMPT = `You are Sage, a warm and practical meal-planning assistant inside the Kindora family app. You help busy caregivers plan their family's meals for the week.

HOW YOU WORK:
1. First, you INTERVIEW the caregiver to understand their needs. Ask short, friendly questions — ONE or TWO at a time, never a long list. Keep the conversation natural and quick.
2. Gather the essentials before planning:
   - How many people you're cooking for (and any kids vs. adults)
   - How many days they want planned, and which meals (just dinners? all three?)
   - Any allergies or dietary needs (vegetarian, gluten-free, dairy-free, etc.)
   - Food preferences, favorite cuisines, or foods to avoid
   - How much time/effort they have for cooking on a typical night
3. Once you have ENOUGH to make a good plan (you don't need every detail — be efficient), call the generate_meal_plan tool to build the plan. Don't keep asking endless questions.

STYLE:
- Warm, encouraging, down-to-earth — like a friend who loves to cook.
- Short messages. No walls of text.
- If the caregiver gives you everything up front, skip straight to generating the plan.
- After you generate a plan, briefly tell them it's ready and that they can save, print, copy, or email it. Offer to adjust anything.

When you call generate_meal_plan:
- Make meals realistic and family-friendly, honoring all dietary needs and preferences they shared.
- Each meal needs a clear name, a one-line description, a full ingredient list, and simple numbered steps.
- Build ONE consolidated grocery list grouped by store section (Produce, Meat & Seafood, Dairy & Eggs, Pantry, Frozen, Bakery, Other). Combine duplicate ingredients across meals into a single line with a sensible total quantity.
- Give the plan a short friendly title (e.g. "5 Dinners for a Family of 4") and a one-sentence summary.`;

const MEAL_PLANNER_TOOL: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "generate_meal_plan",
    description:
      "Generate the finished meal plan once you have enough information from the caregiver. Produces the day-by-day meals with recipes plus one consolidated grocery list grouped by store section.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short friendly title, e.g. '5 Dinners for a Family of 4'" },
        summary: { type: "string", description: "One-sentence description of the plan" },
        days: {
          type: "array",
          description: "The day-by-day plan",
          items: {
            type: "object",
            properties: {
              day: { type: "string", description: "Day label, e.g. 'Monday' or 'Day 1'" },
              meals: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    mealType: { type: "string", description: "breakfast, lunch, dinner, or snack" },
                    name: { type: "string", description: "Name of the dish" },
                    description: { type: "string", description: "One-line description" },
                    ingredients: { type: "array", items: { type: "string" }, description: "Ingredients with quantities" },
                    steps: { type: "array", items: { type: "string" }, description: "Simple numbered cooking steps" },
                  },
                  required: ["mealType", "name", "ingredients", "steps"],
                },
              },
            },
            required: ["day", "meals"],
          },
        },
        grocery_list: {
          type: "array",
          description: "Consolidated shopping list grouped by store section",
          items: {
            type: "object",
            properties: {
              category: { type: "string", description: "Store section, e.g. 'Produce', 'Dairy & Eggs', 'Pantry'" },
              items: { type: "array", items: { type: "string" }, description: "Items with quantities" },
            },
            required: ["category", "items"],
          },
        },
      },
      required: ["title", "days", "grocery_list"],
    },
  },
};

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v).trim()).filter(Boolean);
}

function normalizeDays(value: unknown): MealPlanDay[] {
  if (!Array.isArray(value)) return [];
  return value.map((d: any) => ({
    day: String(d?.day ?? "").trim() || "Day",
    meals: Array.isArray(d?.meals)
      ? d.meals.map((m: any) => ({
          mealType: String(m?.mealType ?? "meal").trim().toLowerCase(),
          name: String(m?.name ?? "Meal").trim(),
          description: m?.description ? String(m.description).trim() : undefined,
          ingredients: normalizeStringArray(m?.ingredients),
          steps: normalizeStringArray(m?.steps),
        }))
      : [],
  }));
}

function normalizeGroceryList(value: unknown): GroceryCategory[] {
  if (!Array.isArray(value)) return [];
  return value.map((g: any) => ({
    category: String(g?.category ?? "Other").trim() || "Other",
    items: normalizeStringArray(g?.items),
  }));
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderPlanHtml(plan: MealPlan): string {
  const days = (plan.days as MealPlanDay[]) ?? [];
  const grocery = (plan.groceryList as GroceryCategory[]) ?? [];
  const daysHtml = days
    .map((d) => {
      const meals = d.meals
        .map((m) => {
          const ingredients = m.ingredients.length
            ? `<ul style="margin:4px 0 8px;padding-left:18px;color:#444;">${m.ingredients.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`
            : "";
          const steps = m.steps.length
            ? `<ol style="margin:4px 0 8px;padding-left:18px;color:#444;">${m.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol>`
            : "";
          return `<div style="margin:0 0 14px;">
            <div style="font-weight:600;color:#111;">${escapeHtml(m.name)} <span style="font-weight:400;color:#888;font-size:13px;">(${escapeHtml(m.mealType)})</span></div>
            ${m.description ? `<div style="color:#666;font-size:14px;margin:2px 0;">${escapeHtml(m.description)}</div>` : ""}
            ${ingredients}
            ${steps}
          </div>`;
        })
        .join("");
      return `<div style="margin:0 0 20px;"><h3 style="margin:0 0 8px;color:#111;">${escapeHtml(d.day)}</h3>${meals}</div>`;
    })
    .join("");
  const groceryHtml = grocery
    .map(
      (g) =>
        `<div style="margin:0 0 12px;"><div style="font-weight:600;color:#111;">${escapeHtml(g.category)}</div><ul style="margin:4px 0;padding-left:18px;color:#444;">${g.items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul></div>`,
    )
    .join("");
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:640px;margin:0 auto;">
    <h1 style="color:#111;">${escapeHtml(plan.title)}</h1>
    ${plan.summary ? `<p style="color:#666;">${escapeHtml(plan.summary)}</p>` : ""}
    ${daysHtml}
    <h2 style="color:#111;border-top:1px solid #eee;padding-top:16px;">Grocery List</h2>
    ${groceryHtml}
  </div>`;
}

function renderPlanText(plan: MealPlan): string {
  const days = (plan.days as MealPlanDay[]) ?? [];
  const grocery = (plan.groceryList as GroceryCategory[]) ?? [];
  const lines: string[] = [plan.title];
  if (plan.summary) lines.push(plan.summary);
  lines.push("");
  for (const d of days) {
    lines.push(d.day.toUpperCase());
    for (const m of d.meals) {
      lines.push(`  ${m.name} (${m.mealType})`);
      if (m.description) lines.push(`    ${m.description}`);
      if (m.ingredients.length) lines.push(`    Ingredients: ${m.ingredients.join(", ")}`);
      m.steps.forEach((s, idx) => lines.push(`    ${idx + 1}. ${s}`));
    }
    lines.push("");
  }
  lines.push("GROCERY LIST");
  for (const g of grocery) {
    lines.push(`  ${g.category}`);
    for (const i of g.items) lines.push(`    - ${i}`);
  }
  return lines.join("\n");
}

export function registerMealPlannerRoutes(app: Express): void {
  // Resolve the caller's family (meal plans are family-scoped, single family/user)
  async function resolveFamilyId(userId: string, bodyFamilyId?: string): Promise<string | null> {
    if (bodyFamilyId) {
      const role = await getUserFamilyRole(storage, userId, bodyFamilyId);
      return role ? bodyFamilyId : null;
    }
    const family = await storage.getUserFamily(userId);
    return family?.id ?? null;
  }

  // Streaming chat: AI interviews the caregiver, then generates a plan via tool call.
  app.post("/api/meals/chat", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const { messages, familyId: bodyFamilyId } = req.body as {
        messages?: { role: "user" | "assistant"; content: string }[];
        familyId?: string;
      };

      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: "messages are required" });
      }

      const familyId = await resolveFamilyId(userId, bodyFamilyId);
      if (!familyId) return res.status(403).json({ error: "You are not a member of this family" });

      const chatMessages = messages
        .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // Phase 1: stream the assistant's reply, collecting any tool call.
      type ToolAcc = { id: string; name: string; arguments: string };
      const toolCallMap = new Map<number, ToolAcc>();
      let textContent = "";

      const stream = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...chatMessages],
        tools: [MEAL_PLANNER_TOOL],
        tool_choice: "auto",
        stream: true,
        max_completion_tokens: 8192,
      });

      for await (const chunk of stream) {
        const choice = chunk.choices[0];
        if (!choice) continue;
        const delta = choice.delta;
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (!toolCallMap.has(tc.index)) {
              toolCallMap.set(tc.index, { id: tc.id ?? "", name: "", arguments: "" });
            }
            const acc = toolCallMap.get(tc.index)!;
            if (tc.id && !acc.id) acc.id = tc.id;
            if (tc.function?.name) acc.name += tc.function.name;
            if (tc.function?.arguments) acc.arguments += tc.function.arguments;
          }
        } else if (delta?.content) {
          textContent += delta.content;
          res.write(`data: ${JSON.stringify({ content: delta.content })}\n\n`);
        }
      }

      // Phase 2: if a plan was generated, persist and stream it back.
      const toolCalls = Array.from(toolCallMap.values()).filter((t) => t.name === "generate_meal_plan");
      if (toolCalls.length > 0) {
        let args: Record<string, unknown> = {};
        try { args = JSON.parse(toolCalls[0].arguments || "{}"); } catch {}

        const days = normalizeDays(args.days);
        const groceryList = normalizeGroceryList(args.grocery_list);

        const daysCheck = aiDaysSchema.safeParse(days);
        const groceryCheck = aiGrocerySchema.safeParse(groceryList);
        if (!daysCheck.success || !groceryCheck.success) {
          res.write(`data: ${JSON.stringify({ error: "The plan came back incomplete — please try again." })}\n\n`);
          res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          return res.end();
        }

        const parsed = insertMealPlanSchema.safeParse({
          familyId,
          title: String(args.title ?? "Meal Plan").slice(0, 200),
          summary: args.summary ? String(args.summary) : null,
          days: daysCheck.data,
          groceryList: groceryCheck.data,
          createdByUserId: userId,
        });

        if (!parsed.success) {
          res.write(`data: ${JSON.stringify({ error: "Could not save the plan." })}\n\n`);
          res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          return res.end();
        }

        const saved = await storage.createMealPlan(parsed.data);
        res.write(`data: ${JSON.stringify({ plan: saved })}\n\n`);
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        return res.end();
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("[MealPlanner] chat error:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Something went wrong." })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to process message" });
      }
    }
  });

  // List saved meal plans for the family
  app.get("/api/meals", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const familyId = await resolveFamilyId(userId, req.query.familyId as string | undefined);
      if (!familyId) return res.status(403).json({ error: "You are not a member of this family" });
      res.json(await storage.getMealPlans(familyId));
    } catch (error) {
      console.error("[MealPlanner] list error:", error);
      res.status(500).json({ error: "Failed to fetch meal plans" });
    }
  });

  // Get a single saved meal plan
  app.get("/api/meals/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const familyId = await resolveFamilyId(userId, req.query.familyId as string | undefined);
      if (!familyId) return res.status(403).json({ error: "You are not a member of this family" });
      const plan = await storage.getMealPlan(req.params.id, familyId);
      if (!plan) return res.status(404).json({ error: "Meal plan not found" });
      res.json(plan);
    } catch (error) {
      console.error("[MealPlanner] get error:", error);
      res.status(500).json({ error: "Failed to fetch meal plan" });
    }
  });

  // Delete a saved meal plan
  app.delete("/api/meals/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const familyId = await resolveFamilyId(userId, req.query.familyId as string | undefined);
      if (!familyId) return res.status(403).json({ error: "You are not a member of this family" });
      await storage.deleteMealPlan(req.params.id, familyId);
      res.status(204).send();
    } catch (error) {
      console.error("[MealPlanner] delete error:", error);
      res.status(500).json({ error: "Failed to delete meal plan" });
    }
  });

  // Email a saved meal plan to an address (defaults to the caller's email)
  app.post("/api/meals/:id/email", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const { familyId: bodyFamilyId, to } = req.body as { familyId?: string; to?: string };
      const familyId = await resolveFamilyId(userId, bodyFamilyId);
      if (!familyId) return res.status(403).json({ error: "You are not a member of this family" });

      const plan = await storage.getMealPlan(req.params.id, familyId);
      if (!plan) return res.status(404).json({ error: "Meal plan not found" });

      let recipient = typeof to === "string" ? to.trim() : "";
      if (!recipient) {
        const user = await storage.getUser(userId);
        recipient = user?.email ?? "";
      }
      if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
        return res.status(400).json({ error: "A valid email address is required" });
      }

      const result = await sendEmail({
        to: recipient,
        subject: `Your meal plan: ${plan.title}`,
        html: renderPlanHtml(plan),
        text: renderPlanText(plan),
      });

      if (!result.success) {
        return res.status(502).json({ error: result.error || "Failed to send email" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("[MealPlanner] email error:", error);
      res.status(500).json({ error: "Failed to email meal plan" });
    }
  });
}
