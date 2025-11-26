import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Sessions table (MANDATORY for auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: text("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// Users table (MANDATORY for auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Families table (shared calendar groups)
export const families = pgTable("families", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  inviteCode: varchar("invite_code").unique().notNull(),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Family Memberships table (links users to families)
export const familyMemberships = pgTable("family_memberships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  familyId: varchar("family_id").notNull(),
  role: varchar("role").notNull().default('member'), // 'owner', 'member', or 'caregiver'
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Family Members table (now belongs to family instead of user)
export const familyMembers = pgTable("family_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  familyId: varchar("family_id").notNull(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  avatar: text("avatar"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Events table (now belongs to family instead of user)
export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  familyId: varchar("family_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  memberIds: text("member_ids").array().notNull(),
  color: text("color").notNull(),
  photoUrl: text("photo_url"),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Messages table (now belongs to family instead of user)
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  familyId: varchar("family_id").notNull(),
  eventId: varchar("event_id").notNull(),
  memberId: varchar("member_id").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Event Notes table - threaded notes for family members and caregivers
export const eventNotes = pgTable("event_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  familyId: varchar("family_id").notNull(),
  eventId: varchar("event_id").notNull(),
  authorUserId: varchar("author_user_id").notNull(), // The logged-in user who wrote the note
  parentNoteId: varchar("parent_note_id"), // For threaded replies, null if top-level note
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Schemas and Types
export const insertFamilySchema = createInsertSchema(families).omit({
  id: true,
  inviteCode: true,
  createdAt: true,
});

export const insertFamilyMembershipSchema = createInsertSchema(familyMemberships).omit({
  id: true,
  joinedAt: true,
}).extend({
  role: z.enum(['owner', 'member', 'caregiver']).default('member'),
});

export const insertFamilyMemberSchema = createInsertSchema(familyMembers).omit({
  id: true,
  familyId: true,
  createdAt: true,
}).extend({
  name: z.string().min(1, "Name is required").trim(),
  color: z.string().min(1, "Color is required"),
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  familyId: true,
  completed: true,
  completedAt: true,
  createdAt: true,
}).extend({
  title: z.string().min(1, "Title is required").trim(),
  memberIds: z.array(z.string()).min(1, "At least one family member is required"),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  familyId: true,
  createdAt: true,
});

export const insertEventNoteSchema = createInsertSchema(eventNotes).omit({
  id: true,
  familyId: true,
  createdAt: true,
}).extend({
  content: z.string().min(1, "Note content is required").trim(),
});

// User types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Family types
export type InsertFamily = z.infer<typeof insertFamilySchema>;
export type Family = typeof families.$inferSelect;

// Family Membership types
export type InsertFamilyMembership = z.infer<typeof insertFamilyMembershipSchema>;
export type FamilyMembership = typeof familyMemberships.$inferSelect;

// Family Member types
export type InsertFamilyMember = z.infer<typeof insertFamilyMemberSchema>;
export type FamilyMember = typeof familyMembers.$inferSelect;

// Event types
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

// Message types
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Event Note types
export type InsertEventNote = z.infer<typeof insertEventNoteSchema>;
export type EventNote = typeof eventNotes.$inferSelect;

// Role constants and utilities
export const FAMILY_ROLES = {
  OWNER: 'owner',
  MEMBER: 'member',
  CAREGIVER: 'caregiver',
} as const;

export type FamilyRole = typeof FAMILY_ROLES[keyof typeof FAMILY_ROLES];

export const ROLE_PERMISSIONS = {
  [FAMILY_ROLES.OWNER]: {
    canCreateEvents: true,
    canEditEvents: true,
    canDeleteEvents: true,
    canCompleteEvents: true,
    canCreateMembers: true,
    canEditMembers: true,
    canDeleteMembers: true,
    canManageFamily: true,
    canInviteMembers: true,
    canViewMessages: true,
    canSendMessages: true,
  },
  [FAMILY_ROLES.MEMBER]: {
    canCreateEvents: true,
    canEditEvents: true,
    canDeleteEvents: true,
    canCompleteEvents: true,
    canCreateMembers: true,
    canEditMembers: true,
    canDeleteMembers: true,
    canManageFamily: false,
    canInviteMembers: true,
    canViewMessages: true,
    canSendMessages: true,
  },
  [FAMILY_ROLES.CAREGIVER]: {
    canCreateEvents: false,
    canEditEvents: false,
    canDeleteEvents: false,
    canCompleteEvents: true,
    canCreateMembers: false,
    canEditMembers: false,
    canDeleteMembers: false,
    canManageFamily: false,
    canInviteMembers: false,
    canViewMessages: true,
    canSendMessages: true,
  },
} as const;
