import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import { chatStorage } from "./replit_integrations/chat/storage";
import { isAuthenticated } from "./replitAuth";
import { storage } from "./storage";
import { format } from "date-fns";

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

// ─── Kira Action Tools ───────────────────────────────────────────────────────

const KIRA_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "create_calendar_event",
      description: "Create a calendar event for the family. Use when the user asks to schedule, book, add, or create any appointment, reminder, or event on the calendar.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Title of the event (required)" },
          start_datetime: { type: "string", description: "ISO 8601 datetime for event start, e.g. 2025-06-15T14:00:00" },
          end_datetime: { type: "string", description: "ISO 8601 datetime for event end (optional, defaults to 1 hour after start)" },
          description: { type: "string", description: "Optional notes or details about the event" },
          category: { type: "string", enum: ["medical", "school", "activity", "work", "family", "eldercare", "other"], description: "Category of the event" },
          member_names: { type: "array", items: { type: "string" }, description: "Names of family members this event is for (optional, leave empty for whole family)" },
        },
        required: ["title", "start_datetime"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_health_note",
      description: "Log a health note or symptom entry for a family member. Use when the user wants to record how they or a family member is feeling, log symptoms, energy, or health observations.",
      parameters: {
        type: "object",
        properties: {
          member_name: { type: "string", description: "First name of the family member to log for (use 'me' or the user's name if logging for themselves)" },
          date: { type: "string", description: "Date for the entry in YYYY-MM-DD format (defaults to today if not specified)" },
          notes: { type: "string", description: "Free-text health notes or symptom description" },
          energy_level: { type: "number", description: "Energy level 1-10 (1 = exhausted, 10 = great)" },
          overall_severity: { type: "number", description: "Overall symptom severity 1-10 (1 = none, 10 = severe)" },
        },
        required: ["member_name", "notes"],
      },
    },
  },
];

interface KiraToolResult {
  name: string;
  success: boolean;
  summary: string;
  data?: Record<string, unknown>;
  error?: string;
}

async function executeKiraTool(
  toolName: string,
  args: Record<string, unknown>,
  familyId: string
): Promise<KiraToolResult> {
  try {
    if (toolName === "create_calendar_event") {
      const title = String(args.title ?? "Untitled Event");
      const startRaw = String(args.start_datetime ?? "");
      const endRaw = args.end_datetime ? String(args.end_datetime) : null;
      const description = args.description ? String(args.description) : undefined;
      const category = String(args.category ?? "other");
      const memberNames: string[] = Array.isArray(args.member_names) ? args.member_names.map(String) : [];

      const startTime = new Date(startRaw);
      if (isNaN(startTime.getTime())) throw new Error("Invalid start datetime");
      const endTime = endRaw ? new Date(endRaw) : new Date(startTime.getTime() + 60 * 60 * 1000);

      // Resolve member names → IDs
      let memberIds: string[] = [];
      if (memberNames.length > 0) {
        const members = await storage.getFamilyMembers(familyId);
        memberIds = members
          .filter(m => memberNames.some(n => m.name.toLowerCase().includes(n.toLowerCase())))
          .map(m => m.id);
      }

      const event = await storage.createEvent(familyId, {
        familyId,
        title,
        description: description ?? null,
        startTime,
        endTime,
        memberIds,
        color: "#f97316",
        category,
        completed: false,
        isImportant: false,
      });

      const dateStr = format(startTime, "EEE, MMM d 'at' h:mm a");
      return {
        name: toolName,
        success: true,
        summary: `Created "${title}" on ${dateStr}`,
        data: { id: event.id, title, startTime: startTime.toISOString(), category },
      };
    }

    if (toolName === "log_health_note") {
      const memberNameArg = String(args.member_name ?? "");
      const date = args.date ? String(args.date) : format(new Date(), "yyyy-MM-dd");
      const notes = String(args.notes ?? "");
      const energyLevel = typeof args.energy_level === "number" ? Math.round(args.energy_level) : undefined;
      const overallSeverity = typeof args.overall_severity === "number" ? Math.round(args.overall_severity) : undefined;

      // Resolve member name → ID
      const members = await storage.getFamilyMembers(familyId);
      let member = members.find(m => m.name.toLowerCase().includes(memberNameArg.toLowerCase()));
      if (!member && members.length > 0) member = members[0]; // Fallback to first member
      if (!member) throw new Error("No family members found");

      await storage.createSymptomEntry(
        {
          familyId,
          memberId: member.id,
          date,
          notes,
          energyLevel: energyLevel ?? null,
          overallSeverity: overallSeverity ?? null,
          reactionFlag: "none",
          triggers: [],
          moodEmoji: null,
        },
        []
      );

      return {
        name: toolName,
        success: true,
        summary: `Logged health note for ${member.name} on ${date}`,
        data: { memberId: member.id, memberName: member.name, date, notes },
      };
    }

    return { name: toolName, success: false, error: "Unknown tool", summary: "Unknown action" };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { name: toolName, success: false, error: msg, summary: `Failed: ${msg}` };
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

  // Send a message and stream back AI response (with optional tool/action support)
  app.post("/api/advisor/conversations/:id/messages", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const conversationId = parseInt(req.params.id);
      const { content, priorGreeting } = req.body;

      if (!content?.trim()) return res.status(400).json({ error: "Message content required" });

      // If a prior greeting was shown to the user, save it as the first assistant message
      if (priorGreeting?.trim()) {
        const existing = await chatStorage.getMessagesByConversation(conversationId);
        if (existing.length === 0) {
          await chatStorage.createMessage(conversationId, "assistant", priorGreeting.trim());
        }
      }

      // Save user message
      await chatStorage.createMessage(conversationId, "user", content);
      storage.trackAdvisorMessage(userId).catch(() => {});

      // Build context
      const history = await chatStorage.getMessagesByConversation(conversationId);
      const chatMessages = history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      const family = await getFamilyForUser(userId);
      const familyId = family?.id;
      const memories = familyId ? await storage.getKiraMemories(familyId) : [];
      const memoryContents = memories.map(m => m.content);
      const systemPrompt = buildSystemPrompt(family ?? undefined, memoryContents);

      // Set up SSE
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // ── Phase 1: Stream first response, collecting any tool calls ──
      type ToolCallAccumulator = { id: string; name: string; arguments: string };
      const toolCallMap: Map<number, ToolCallAccumulator> = new Map();
      let firstContent = "";

      const stream1 = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...chatMessages,
        ],
        tools: KIRA_TOOLS,
        tool_choice: "auto",
        stream: true,
        max_completion_tokens: 8192,
      });

      let finishReason: string | null = null;

      for await (const chunk of stream1) {
        const choice = chunk.choices[0];
        if (!choice) continue;
        finishReason = choice.finish_reason ?? finishReason;

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
          firstContent += delta.content;
          res.write(`data: ${JSON.stringify({ content: delta.content })}\n\n`);
        }
      }

      // ── Phase 2: If tools were called, execute them ──
      const toolCalls = Array.from(toolCallMap.values());
      const toolResults: KiraToolResult[] = [];

      if (toolCalls.length > 0 && familyId) {
        for (const tc of toolCalls) {
          let args: Record<string, unknown> = {};
          try { args = JSON.parse(tc.arguments || "{}"); } catch {}
          const result = await executeKiraTool(tc.name, args, familyId);
          toolResults.push(result);
          // Stream the action card event to the client
          res.write(`data: ${JSON.stringify({ tool: result })}\n\n`);
        }

        // ── Phase 3: Stream narrative response incorporating tool results ──
        const toolResultMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
          {
            role: "assistant",
            content: firstContent || null,
            tool_calls: toolCalls.map(tc => ({
              id: tc.id,
              type: "function" as const,
              function: { name: tc.name, arguments: tc.arguments },
            })),
          },
          ...toolCalls.map((tc, i) => ({
            role: "tool" as const,
            tool_call_id: tc.id,
            content: JSON.stringify(toolResults[i]),
          })),
        ];

        let narrativeContent = "";
        const stream2 = await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: [
            { role: "system", content: systemPrompt },
            ...chatMessages,
            ...toolResultMessages,
          ],
          stream: true,
          max_completion_tokens: 1024,
        });

        for await (const chunk of stream2) {
          const delta = chunk.choices[0]?.delta?.content || "";
          if (delta) {
            narrativeContent += delta;
            res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
          }
        }

        const fullResponse = narrativeContent || firstContent;
        const metadata = JSON.stringify({ tools: toolResults });
        await chatStorage.createMessage(conversationId, "assistant", fullResponse, metadata);

        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();

        if (familyId && content && fullResponse) {
          extractAndSaveMemories(familyId, content, fullResponse).catch(() => {});
        }
      } else {
        // No tool calls — normal flow
        await chatStorage.createMessage(conversationId, "assistant", firstContent);
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();

        if (familyId && content && firstContent) {
          extractAndSaveMemories(familyId, content, firstContent).catch(() => {});
        }
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
