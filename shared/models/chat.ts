import { pgTable, serial, integer, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export const advisorConversations = pgTable("advisor_conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  userId: text("user_id"),
  archived: boolean("archived").default(false).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const advisorMessages = pgTable("advisor_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => advisorConversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  metadata: text("metadata"), // JSON string: { tools: [{ name, args, result }] }
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertAdvisorConversationSchema = createInsertSchema(advisorConversations).omit({
  id: true,
  createdAt: true,
});

export const insertAdvisorMessageSchema = createInsertSchema(advisorMessages).omit({
  id: true,
  createdAt: true,
});

export type AdvisorConversation = typeof advisorConversations.$inferSelect;
export type InsertAdvisorConversation = z.infer<typeof insertAdvisorConversationSchema>;
export type AdvisorMessage = typeof advisorMessages.$inferSelect;
export type InsertAdvisorMessage = z.infer<typeof insertAdvisorMessageSchema>;
