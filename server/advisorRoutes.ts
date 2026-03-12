import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import { chatStorage } from "./replit_integrations/chat/storage";
import { isAuthenticated } from "./replitAuth";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const ADVISOR_SYSTEM_PROMPT = `You are Kira, a warm and experienced family advisor within the Kindora Calendar app. You specialize in supporting the "sandwich generation" — people who are simultaneously raising children and caring for aging parents.

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

Important boundaries:
- You are a supportive resource, NOT a licensed therapist, doctor, or medical provider
- For medical symptoms or safety concerns, always recommend consulting a healthcare professional
- For mental health crises, provide crisis resources (988 Suicide & Crisis Lifeline, etc.)
- Remind users you're an AI when it feels appropriate, not defensively

Start each new conversation by warmly asking what's going on — let them lead. If they describe a situation, validate their feelings first, then offer 2-3 concrete suggestions they can try.`;

export function registerAdvisorRoutes(app: Express): void {
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

  // Send a message and stream back AI response
  app.post("/api/advisor/conversations/:id/messages", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { content } = req.body;

      if (!content?.trim()) return res.status(400).json({ error: "Message content required" });

      // Save user message
      await chatStorage.createMessage(conversationId, "user", content);

      // Get conversation history
      const history = await chatStorage.getMessagesByConversation(conversationId);
      const chatMessages = history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      // Set up SSE streaming
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [
          { role: "system", content: ADVISOR_SYSTEM_PROMPT },
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
