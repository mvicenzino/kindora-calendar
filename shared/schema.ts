import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, index, numeric } from "drizzle-orm/pg-core";
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

// Medications table - tracks medications for care recipients
export const medications = pgTable("medications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  familyId: varchar("family_id").notNull(),
  memberId: varchar("member_id").notNull(), // The family member (care recipient) this medication is for
  name: text("name").notNull(),
  dosage: text("dosage").notNull(), // e.g., "10mg", "2 tablets"
  frequency: text("frequency").notNull(), // e.g., "twice daily", "every 8 hours"
  instructions: text("instructions"), // Special instructions like "take with food"
  scheduledTimes: text("scheduled_times").array(), // Array of times like ["08:00", "20:00"]
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Medication Logs table - tracks when medications were administered
export const medicationLogs = pgTable("medication_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  medicationId: varchar("medication_id").notNull(),
  familyId: varchar("family_id").notNull(),
  administeredBy: varchar("administered_by").notNull(), // User ID who logged the dose
  scheduledTime: timestamp("scheduled_time"), // When it was supposed to be given
  administeredAt: timestamp("administered_at").notNull(), // When it was actually given
  status: varchar("status").notNull().default("given"), // 'given', 'skipped', 'refused'
  notes: text("notes"), // Optional notes about the dose
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Family Messages table - global conversation thread for family members and caregivers
export const familyMessages = pgTable("family_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  familyId: varchar("family_id").notNull(),
  authorUserId: varchar("author_user_id").notNull(), // The logged-in user who sent the message
  content: text("content").notNull(),
  parentMessageId: varchar("parent_message_id"), // For threading - references parent message id
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Caregiver Pay Rates table - stores hourly rate per caregiver per family
export const caregiverPayRates = pgTable("caregiver_pay_rates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  familyId: varchar("family_id").notNull(),
  caregiverUserId: varchar("caregiver_user_id").notNull(), // The caregiver user
  hourlyRate: numeric("hourly_rate", { precision: 10, scale: 2 }).notNull(), // e.g., 28.50
  currency: varchar("currency").notNull().default("USD"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Caregiver Time Entries table - tracks hours worked by caregivers
export const caregiverTimeEntries = pgTable("caregiver_time_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  familyId: varchar("family_id").notNull(),
  caregiverUserId: varchar("caregiver_user_id").notNull(),
  hoursWorked: numeric("hours_worked", { precision: 5, scale: 2 }).notNull(), // e.g., 4.5 hours
  entryDate: timestamp("entry_date").notNull(), // The date of work
  notes: text("notes"), // Optional description of work done
  hourlyRateAtTime: numeric("hourly_rate_at_time", { precision: 10, scale: 2 }).notNull(), // Rate when logged
  calculatedPay: numeric("calculated_pay", { precision: 10, scale: 2 }).notNull(), // hours * rate
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

export const insertMedicationSchema = createInsertSchema(medications).omit({
  id: true,
  familyId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1, "Medication name is required").trim(),
  dosage: z.string().min(1, "Dosage is required").trim(),
  frequency: z.string().min(1, "Frequency is required").trim(),
  scheduledTimes: z.array(z.string()).optional(),
});

export const insertMedicationLogSchema = createInsertSchema(medicationLogs).omit({
  id: true,
  familyId: true,
  createdAt: true,
}).extend({
  status: z.enum(['given', 'skipped', 'refused']).default('given'),
  administeredAt: z.coerce.date(),
  scheduledTime: z.coerce.date().optional(),
});

export const insertFamilyMessageSchema = createInsertSchema(familyMessages).omit({
  id: true,
  familyId: true,
  createdAt: true,
}).extend({
  content: z.string().min(1, "Message content is required").trim(),
});

export const insertCaregiverPayRateSchema = createInsertSchema(caregiverPayRates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  hourlyRate: z.string().or(z.number()).transform(val => String(val)),
  currency: z.string().default("USD"),
});

export const insertCaregiverTimeEntrySchema = createInsertSchema(caregiverTimeEntries).omit({
  id: true,
  familyId: true,
  caregiverUserId: true,
  hourlyRateAtTime: true,
  calculatedPay: true,
  createdAt: true,
}).extend({
  hoursWorked: z.string().or(z.number()).transform(val => String(val)),
  entryDate: z.coerce.date(),
  notes: z.string().optional(),
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

// Medication types
export type InsertMedication = z.infer<typeof insertMedicationSchema>;
export type Medication = typeof medications.$inferSelect;

// Medication Log types
export type InsertMedicationLog = z.infer<typeof insertMedicationLogSchema>;
export type MedicationLog = typeof medicationLogs.$inferSelect;

// Family Message types
export type InsertFamilyMessage = z.infer<typeof insertFamilyMessageSchema>;
export type FamilyMessage = typeof familyMessages.$inferSelect;

// Caregiver Pay Rate types
export type InsertCaregiverPayRate = z.infer<typeof insertCaregiverPayRateSchema>;
export type CaregiverPayRate = typeof caregiverPayRates.$inferSelect;

// Caregiver Time Entry types
export type InsertCaregiverTimeEntry = z.infer<typeof insertCaregiverTimeEntrySchema>;
export type CaregiverTimeEntry = typeof caregiverTimeEntries.$inferSelect;

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
    canManageMedications: true,
    canLogMedications: true,
    canViewMedications: true,
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
    canManageMedications: true,
    canLogMedications: true,
    canViewMedications: true,
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
    canManageMedications: false,
    canLogMedications: true,
    canViewMedications: true,
  },
} as const;
