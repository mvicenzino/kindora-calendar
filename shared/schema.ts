import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const familyMembers = pgTable("family_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  color: text("color").notNull(),
  avatar: text("avatar"),
});

export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  memberId: varchar("member_id").notNull(),
  color: text("color").notNull(),
  photoUrl: text("photo_url"),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull(),
  memberId: varchar("member_id").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertFamilyMemberSchema = createInsertSchema(familyMembers).omit({
  id: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  completed: true,
  completedAt: true,
}).extend({
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type InsertFamilyMember = z.infer<typeof insertFamilyMemberSchema>;
export type FamilyMember = typeof familyMembers.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
