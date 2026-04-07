import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import { chatStorage } from "./replit_integrations/chat/storage";
import { isAuthenticated } from "./replitAuth";
import { storage } from "./storage";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const BASE_SYSTEM_PROMPT = `You are Kira, a warm and deeply trusted family advisor within the Kindora app. You specialize in supporting the "sandwich generation" — people who are simultaneously raising children and caring for aging parents.

You feel like a close friend who has been walking alongside this family for years. You remember names, circumstances, and the emotional weight of what they're carrying. You never make them explain themselves from scratch.

Your expertise covers:
- Child development and behavior (toddlers, school-age children, teens)
  • Picky eating, feeding challenges, mealtime struggles
  • Potty training difficulties and regressions
  • Biting, hitting, and other behavioral challenges
  • Sleep issues, tantrums, separation anxiety
  • Screen time, social development, school transitions
- Eldercare and aging parent challenges
  • Dementia and Alzheimer's — memory loss, confusion, wandering, sundowning
  • Caregiver burnout, emotional exhaustion, resentment
  • Difficult conversations about driving, living arrangements, finances
  • Managing medical appointments, medications, and care coordination
  • Sibling disagreements about parent care
- Caregiver self-care and stress management
  • Setting boundaries without guilt
  • Finding support, respite care, and community resources
  • Managing your own mental health while caring for others

Your communication style:
- Warm, empathetic, and non-judgmental — you understand this is genuinely hard
- Practical and actionable — give real, specific suggestions they can try today
- Validating — acknowledge feelings before jumping to solutions
- Honest — if something needs professional attention (doctor, therapist, social worker), say so clearly
- Conversational — match the user's tone, keep responses focused and readable
- Use short paragraphs; avoid walls of text
- Always reference names and specific situations from what you know — never speak generically when you have context

Important boundaries:
- You are a supportive resource, NOT a licensed therapist, doctor, or medical provider
- For medical symptoms or safety concerns, always recommend consulting a healthcare professional
- For mental health crises, provide crisis resources (988 Suicide & Crisis Lifeline, etc.)
- Remind users you're an AI when it feels appropriate, not defensively`;

function buildSystemPrompt(
  family?: {
    advisorChildrenContext?: string | null;
    advisorElderContext?: string | null;
    advisorSelfContext?: string | null;
  },
  memories?: string[]
): string {
  const parts: string[] = [];

  if (family?.advisorChildrenContext?.trim()) {
    parts.push(`About their children:\n${family.advisorChildrenContext.trim()}`);
  }
  if (family?.advisorElderContext?.trim()) {
    parts.push(`About their aging parents or loved ones:\n${family.advisorElderContext.trim()}`);
  }
  if (family?.advisorSelfContext?.trim()) {
    parts.push(`About the user themselves:\n${family.advisorSelfContext.trim()}`);
  }

  const memoryLines = memories?.filter(Boolean) ?? [];

  if (parts.length === 0 && memoryLines.length === 0) return BASE_SYSTEM_PROMPT;

  let prompt = BASE_SYSTEM_PROMPT + "\n\n---";

  if (parts.length > 0) {
    prompt += `\nFAMILY CONTEXT — You know this family well. Use names, reference specific situations, and never make them repeat themselves. Weave this naturally into every response:\n\n${parts.join("\n\n")}`;
  }

  if (memoryLines.length > 0) {
    prompt += `\n\nKIRA'S MEMORY — Things you've learned about this family from past conversations. Reference these naturally when relevant:\n${memoryLines.map(m => `- ${m}`).join("\n")}`;
  }

  prompt += "\n---";
  return prompt;
}

async function extractAndSaveMemories(
  familyId: string,
  userMessage: string,
  assistantResponse: string
): Promise<void> {
  try {
    const extraction = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `You extract memorable personal facts from conversations for a family AI advisor.
Extract only concrete, specific facts worth remembering long-term: names, ages, diagnoses, relationships, living situations, recurring challenges, or important preferences.
Output ONLY a valid JSON array of short strings (max 15 words each). Each string should be a self-contained fact.
If nothing memorable was shared, output an empty array: []
Do not include opinions, advice given, or generic statements.`,
        },
        {
          role: "user",
          content: `User said: "${userMessage.slice(0, 500)}"\n\nKira said: "${assistantResponse.slice(0, 500)}"`,
        },
      ],
      max_completion_tokens: 200,
    });

    const raw = extraction.choices[0]?.message?.content?.trim() ?? "[]";
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return;
    const facts: string[] = JSON.parse(match[0]);
    if (!Array.isArray(facts) || facts.length === 0) return;
    const valid = facts.filter((f): f is string => typeof f === "string" && f.trim().length > 0).slice(0, 5);
    if (valid.length > 0) {
      await storage.addKiraMemories(familyId, valid);
    }
  } catch {
    // Memory extraction is best-effort — never block the main flow
  }
}

function buildGreetingPrompt(): string {
  return `Open this conversation with a personal, warm check-in message — as if you've been thinking about this family and want to reconnect.

Your opening message should:
- Be 2–3 short paragraphs, conversational and human
- Reference their specific situation using names and details from what you know — make it clear you remember them
- Offer one genuine, concrete observation or insight that might actually help them right now — something grounded in their real circumstances
- End with a natural, open-ended question that invites them to share what's on their mind today

Tone rules:
- Don't open with "Hi" or "Hello" or "Hey" — start with something more engaged and present
- Sound like a trusted confidant who's been paying attention, not a help desk
- Keep it warm but grounded — not over-enthusiastic, not clinical
- This should feel like hearing from a friend who genuinely knows them`;
}

async function getFamilyForUser(userId: string) {
  try {
    const families = await storage.getUserFamilies(userId);
    if (families.length === 0) return null;
    return families[0];
  } catch {
    return null;
  }
}

export function registerAdvisorRoutes(app: Express): void {
  // Get advisor context for the user's family
  app.get("/api/advisor/profile", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const family = await getFamilyForUser(userId);
      if (!family) return res.json({ advisorChildrenContext: "", advisorElderContext: "", advisorSelfContext: "" });
      res.json({
        familyId: family.id,
        advisorChildrenContext: family.advisorChildrenContext ?? "",
        advisorElderContext: family.advisorElderContext ?? "",
        advisorSelfContext: family.advisorSelfContext ?? "",
      });
    } catch (error) {
      console.error("Error fetching advisor profile:", error);
      res.status(500).json({ error: "Failed to fetch advisor profile" });
    }
  });

  // Save advisor context for the user's family
  app.patch("/api/advisor/profile", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const { advisorChildrenContext, advisorElderContext, advisorSelfContext } = req.body;

      const families = await storage.getUserFamilies(userId);
      if (families.length === 0) return res.status(404).json({ error: "No family found" });

      const familyId = families[0].id;
      const updated = await storage.updateFamily(familyId, {
        advisorChildrenContext: advisorChildrenContext?.slice(0, 2000) ?? null,
        advisorElderContext: advisorElderContext?.slice(0, 2000) ?? null,
        advisorSelfContext: advisorSelfContext?.slice(0, 2000) ?? null,
      });

      res.json(updated);
    } catch (error) {
      console.error("Error saving advisor profile:", error);
      res.status(500).json({ error: "Failed to save advisor profile" });
    }
  });

  // Admin stats — advisor usage across all real users
  app.get("/api/admin/advisor-stats", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const allUsage = await storage.getAllAdvisorUsage();

      // Enrich with user emails for readability
      const enriched = await Promise.all(
        allUsage.map(async (u) => {
          const user = await storage.getUser(u.userId).catch(() => null);
          return {
            userId: u.userId,
            email: user?.email ?? "(unknown)",
            totalMessages: u.totalMessages,
            totalGreetings: u.totalGreetings,
            totalConversations: u.totalConversations,
            firstSeenAt: u.firstSeenAt,
            lastMessageAt: u.lastMessageAt,
          };
        })
      );

      res.json({
        totalUsers: enriched.length,
        totalMessages: enriched.reduce((sum, u) => sum + u.totalMessages, 0),
        totalConversations: enriched.reduce((sum, u) => sum + u.totalConversations, 0),
        totalGreetings: enriched.reduce((sum, u) => sum + u.totalGreetings, 0),
        users: enriched,
      });
    } catch (error) {
      console.error("Error fetching advisor stats:", error);
      res.status(500).json({ error: "Failed to fetch advisor stats" });
    }
  });

  // Generate a personalized greeting from Kira (streamed, no conversation required)
  app.post("/api/advisor/greet", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const family = await getFamilyForUser(userId);

      if (!family) {
        return res.status(400).json({ error: "No family profile found" });
      }

      const hasContext =
        family.advisorChildrenContext?.trim() ||
        family.advisorElderContext?.trim() ||
        family.advisorSelfContext?.trim();

      if (!hasContext) {
        return res.status(400).json({ error: "No family context to generate greeting" });
      }

      const systemPrompt = buildSystemPrompt(family);
      const greetingPrompt = buildGreetingPrompt();

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: greetingPrompt },
        ],
        stream: true,
        max_completion_tokens: 500,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || "";
        if (delta) {
          res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
        }
      }

      // Track greeting usage (fire-and-forget)
      storage.trackAdvisorGreeting(userId).catch(() => {});

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error generating greeting:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to generate greeting" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to generate greeting" });
      }
    }
  });

  // Get Kira's memories for the user's family
  app.get("/api/advisor/memories", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const family = await getFamilyForUser(userId);
      if (!family) return res.json([]);
      const memories = await storage.getKiraMemories(family.id);
      res.json(memories);
    } catch (error) {
      console.error("Error fetching Kira memories:", error);
      res.status(500).json({ error: "Failed to fetch memories" });
    }
  });

  // Clear all Kira memories for the user's family
  app.delete("/api/advisor/memories", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const family = await getFamilyForUser(userId);
      if (!family) return res.status(404).json({ error: "No family found" });
      await storage.clearKiraMemories(family.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error clearing Kira memories:", error);
      res.status(500).json({ error: "Failed to clear memories" });
    }
  });

  // Get user's advisor conversations
  app.get("/api/advisor/conversations", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const conversations = await chatStorage.getAllConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching advisor conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Get a single conversation with messages
  app.get("/api/advisor/conversations/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const conversation = await chatStorage.getConversation(id);
      if (!conversation) return res.status(404).json({ error: "Conversation not found" });
      const messages = await chatStorage.getMessagesByConversation(id);
      res.json({ ...conversation, messages });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  // Create a new conversation
  app.post("/api/advisor/conversations", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const { title } = req.body;
      const conversation = await chatStorage.createConversation(title || "New conversation", userId);
      // Track conversation creation (fire-and-forget)
      storage.trackAdvisorConversation(userId).catch(() => {});
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  // Delete a conversation
  app.delete("/api/advisor/conversations/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await chatStorage.deleteConversation(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  // Archive / unarchive a conversation
  app.patch("/api/advisor/conversations/:id/archive", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { archived } = req.body;
      const conversation = await chatStorage.archiveConversation(id, !!archived);
      if (!conversation) return res.status(404).json({ error: "Conversation not found" });
      res.json(conversation);
    } catch (error) {
      console.error("Error archiving conversation:", error);
      res.status(500).json({ error: "Failed to archive conversation" });
    }
  });

  // Send a message and stream back AI response
  app.post("/api/advisor/conversations/:id/messages", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const conversationId = parseInt(req.params.id);
      const { content, priorGreeting } = req.body;

      if (!content?.trim()) return res.status(400).json({ error: "Message content required" });

      // If a prior greeting was shown to the user, save it as the first assistant message
      // (only if this conversation has no messages yet)
      if (priorGreeting?.trim()) {
        const existing = await chatStorage.getMessagesByConversation(conversationId);
        if (existing.length === 0) {
          await chatStorage.createMessage(conversationId, "assistant", priorGreeting.trim());
        }
      }

      // Save user message
      await chatStorage.createMessage(conversationId, "user", content);
      // Track message usage (fire-and-forget)
      storage.trackAdvisorMessage(userId).catch(() => {});

      // Get conversation history
      const history = await chatStorage.getMessagesByConversation(conversationId);
      const chatMessages = history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      // Build personalized system prompt using family context + Kira's memories
      const family = await getFamilyForUser(userId);
      const familyId = family?.id;
      const memories = familyId ? await storage.getKiraMemories(familyId) : [];
      const memoryContents = memories.map(m => m.content);
      const systemPrompt = buildSystemPrompt(family ?? undefined, memoryContents);

      // Set up SSE streaming
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...chatMessages,
        ],
        stream: true,
        max_completion_tokens: 8192,
      });

      let fullResponse = "";

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || "";
        if (delta) {
          fullResponse += delta;
          res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
        }
      }

      // Save assistant response
      await chatStorage.createMessage(conversationId, "assistant", fullResponse);

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();

      // Fire-and-forget memory extraction from this exchange
      if (familyId && content && fullResponse) {
        extractAndSaveMemories(familyId, content, fullResponse).catch(() => {});
      }
    } catch (error) {
      console.error("Error processing advisor message:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to get response" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to process message" });
      }
    }
  });
}
