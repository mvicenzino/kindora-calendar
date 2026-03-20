import { db } from "../../db";
import { advisorConversations, advisorMessages } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import type { AdvisorConversation, AdvisorMessage } from "@shared/schema";

export interface IChatStorage {
  getConversation(id: number): Promise<AdvisorConversation | undefined>;
  getAllConversations(userId?: string): Promise<AdvisorConversation[]>;
  createConversation(title: string, userId?: string): Promise<AdvisorConversation>;
  deleteConversation(id: number): Promise<void>;
  getMessagesByConversation(conversationId: number): Promise<AdvisorMessage[]>;
  createMessage(conversationId: number, role: string, content: string): Promise<AdvisorMessage>;
}

export const chatStorage: IChatStorage = {
  async getConversation(id: number) {
    const [conversation] = await db.select().from(advisorConversations).where(eq(advisorConversations.id, id));
    return conversation;
  },

  async getAllConversations(userId?: string) {
    if (userId) {
      return db.select().from(advisorConversations)
        .where(eq(advisorConversations.userId, userId))
        .orderBy(desc(advisorConversations.createdAt));
    }
    return db.select().from(advisorConversations).orderBy(desc(advisorConversations.createdAt));
  },

  async createConversation(title: string, userId?: string) {
    const [conversation] = await db.insert(advisorConversations).values({ title, userId }).returning();
    return conversation;
  },

  async deleteConversation(id: number) {
    await db.delete(advisorMessages).where(eq(advisorMessages.conversationId, id));
    await db.delete(advisorConversations).where(eq(advisorConversations.id, id));
  },

  async getMessagesByConversation(conversationId: number) {
    return db.select().from(advisorMessages)
      .where(eq(advisorMessages.conversationId, conversationId))
      .orderBy(advisorMessages.createdAt);
  },

  async createMessage(conversationId: number, role: string, content: string) {
    const [message] = await db.insert(advisorMessages).values({ conversationId, role, content }).returning();
    return message;
  },
};
