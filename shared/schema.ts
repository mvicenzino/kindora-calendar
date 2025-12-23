import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, index, numeric, integer } from "drizzle-orm/pg-core";
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
  recurrenceRule: varchar("recurrence_rule"), // 'daily', 'weekly', 'biweekly', 'monthly', 'yearly', or null for non-recurring
  recurrenceEndDate: timestamp("recurrence_end_date"), // When the recurrence ends (optional)
  recurrenceCount: varchar("recurrence_count"), // Number of occurrences (stored as string, optional)
  recurringEventId: varchar("recurring_event_id"), // Links instances to the parent/first event in the series
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

// Weekly Summary Schedule table - admin-configurable schedule per family
export const weeklySummarySchedules = pgTable("weekly_summary_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  familyId: varchar("family_id").notNull().unique(), // One schedule per family
  isEnabled: boolean("is_enabled").notNull().default(false),
  dayOfWeek: varchar("day_of_week").notNull().default("0"), // 0=Sunday, 1=Monday, etc.
  timeOfDay: varchar("time_of_day").notNull().default("08:00"), // 24h format HH:MM
  timezone: varchar("timezone").notNull().default("America/New_York"),
  lastSentAt: timestamp("last_sent_at"), // Track when last sent
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Weekly Summary Preferences table - user opt-in preferences
export const weeklySummaryPreferences = pgTable("weekly_summary_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  familyId: varchar("family_id").notNull(),
  optedIn: boolean("opted_in").notNull().default(true), // Users opt-in by default
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Care Documents table - secure document storage for care-related files
export const careDocuments = pgTable("care_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  familyId: varchar("family_id").notNull(),
  memberId: varchar("member_id"), // Optional - can be family-wide or member-specific
  uploadedBy: varchar("uploaded_by").notNull(), // User ID who uploaded
  title: text("title").notNull(),
  description: text("description"),
  documentType: varchar("document_type").notNull(), // 'medical', 'insurance', 'legal', 'care_plan', 'other'
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(), // Object storage path
  fileSize: varchar("file_size"), // Size in bytes as string
  mimeType: varchar("mime_type"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Emergency Bridge Tokens - time-limited access links for backup caregivers
export const emergencyBridgeTokens = pgTable("emergency_bridge_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  familyId: varchar("family_id").notNull(),
  tokenHash: varchar("token_hash").notNull().unique(), // Hashed token for lookup
  createdByUserId: varchar("created_by_user_id").notNull(),
  label: varchar("label"), // Optional description like "For Aunt Mary"
  expiresAt: timestamp("expires_at").notNull(),
  status: varchar("status").notNull().default("active"), // 'active', 'revoked', 'expired'
  accessCount: integer("access_count").notNull().default(0),
  lastAccessedAt: timestamp("last_accessed_at"),
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
  recurrenceRule: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'yearly']).nullable().optional(),
  recurrenceEndDate: z.coerce.date().nullable().optional(),
  recurrenceCount: z.string().nullable().optional(),
  recurringEventId: z.string().nullable().optional(),
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

export const insertWeeklySummaryScheduleSchema = createInsertSchema(weeklySummarySchedules).omit({
  id: true,
  lastSentAt: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  isEnabled: z.boolean().default(false),
  dayOfWeek: z.string().regex(/^[0-6]$/, "Day must be 0-6 (Sunday-Saturday)"),
  timeOfDay: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in HH:MM format"),
  timezone: z.string().min(1, "Timezone is required"),
});

export const insertWeeklySummaryPreferenceSchema = createInsertSchema(weeklySummaryPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  optedIn: z.boolean().default(true),
});

export const DOCUMENT_TYPES = ['medical', 'insurance', 'legal', 'care_plan', 'other'] as const;
export type DocumentType = typeof DOCUMENT_TYPES[number];

export const insertCareDocumentSchema = createInsertSchema(careDocuments).omit({
  id: true,
  familyId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  title: z.string().min(1, "Title is required").trim(),
  documentType: z.enum(DOCUMENT_TYPES),
  fileName: z.string().min(1, "File name is required"),
  fileUrl: z.string().min(1, "File URL is required"),
  memberId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  fileSize: z.string().optional().nullable(),
  mimeType: z.string().optional().nullable(),
});

export const BRIDGE_EXPIRATION_OPTIONS = ['24h', '48h', '7d'] as const;
export type BridgeExpiration = typeof BRIDGE_EXPIRATION_OPTIONS[number];

export const insertEmergencyBridgeTokenSchema = createInsertSchema(emergencyBridgeTokens).omit({
  id: true,
  tokenHash: true,
  familyId: true,
  createdByUserId: true,
  status: true,
  accessCount: true,
  lastAccessedAt: true,
  createdAt: true,
}).extend({
  label: z.string().optional().nullable(),
  expiresAt: z.coerce.date(),
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

// Weekly Summary Schedule types
export type InsertWeeklySummarySchedule = z.infer<typeof insertWeeklySummaryScheduleSchema>;
export type WeeklySummarySchedule = typeof weeklySummarySchedules.$inferSelect;

// Weekly Summary Preference types
export type InsertWeeklySummaryPreference = z.infer<typeof insertWeeklySummaryPreferenceSchema>;
export type WeeklySummaryPreference = typeof weeklySummaryPreferences.$inferSelect;

// Care Document types
export type InsertCareDocument = z.infer<typeof insertCareDocumentSchema>;
export type CareDocument = typeof careDocuments.$inferSelect;

// Emergency Bridge Token types
export type InsertEmergencyBridgeToken = z.infer<typeof insertEmergencyBridgeTokenSchema>;
export type EmergencyBridgeToken = typeof emergencyBridgeTokens.$inferSelect;

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
    canUploadDocuments: true,
    canDeleteDocuments: true,
    canViewDocuments: true,
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
    canUploadDocuments: true,
    canDeleteDocuments: true,
    canViewDocuments: true,
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
    canUploadDocuments: false,
    canDeleteDocuments: false,
    canViewDocuments: true,
  },
} as const;
