import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, index, uniqueIndex, numeric, integer, serial, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const EVENT_CATEGORIES = [
  'medical',
  'school',
  'activities',
  'errands',
  'financial',
  'social',
  'caregiving',
  'work',
  'other',
] as const;

export type EventCategory = typeof EVENT_CATEGORIES[number];

export const CATEGORY_CONFIG: Record<EventCategory, { label: string; color: string; description: string }> = {
  medical:    { label: 'Medical',     color: '#E53E3E', description: 'Doctor visits, medications, health' },
  school:     { label: 'School',      color: '#3B82F6', description: 'School drop-offs, classes, homework' },
  activities: { label: 'Activities',  color: '#8B5CF6', description: 'Sports, lessons, hobbies' },
  errands:    { label: 'Errands',     color: '#F59E0B', description: 'Shopping, chores, to-dos' },
  financial:  { label: 'Financial',   color: '#10B981', description: 'Bills, payments, budgeting' },
  social:     { label: 'Social',      color: '#EC4899', description: 'Parties, playdates, gatherings' },
  caregiving: { label: 'Caregiving',  color: '#F97316', description: 'Eldercare, therapy, respite' },
  work:       { label: 'Work',        color: '#6366F1', description: 'Meetings, deadlines, work tasks' },
  other:      { label: 'Other',       color: '#64748B', description: 'Everything else' },
};

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
export const SUBSCRIPTION_TIERS = ['free', 'family', 'professional'] as const;
export type SubscriptionTier = typeof SUBSCRIPTION_TIERS[number];

export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  passwordHash: varchar("password_hash"),
  authProvider: varchar("auth_provider").default("local"),
  emailVerified: boolean("email_verified").default(false),
  emailVerifyToken: varchar("email_verify_token"),
  emailVerifyExpires: timestamp("email_verify_expires"),
  passwordResetToken: varchar("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionTier: varchar("subscription_tier").default("free"),
  subscriptionStatus: varchar("subscription_status").default("inactive"),
  welcomeEmailClaimedAt: timestamp("welcome_email_claimed_at"),
  welcomeEmailSentAt: timestamp("welcome_email_sent_at"),
  timezone: varchar("timezone"), // IANA timezone (e.g. "America/New_York"); set on signup or first visit
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
  advisorChildrenContext: text("advisor_children_context"),
  advisorElderContext: text("advisor_elder_context"),
  advisorSelfContext: text("advisor_self_context"),
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
  userId: varchar("user_id"), // optional link to a user account; null for kids/elders without logins
  name: text("name").notNull(),
  color: text("color").notNull(),
  avatar: text("avatar"),
  role: text("role").default("family"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Each user can only be linked to a given family once as a calendar member
  uniqFamilyUser: uniqueIndex("family_members_family_user_unique")
    .on(table.familyId, table.userId)
    .where(sql`user_id IS NOT NULL`),
}));

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
  category: varchar("category").notNull().default("other"),
  photoUrl: text("photo_url"),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  recurrenceRule: varchar("recurrence_rule"), // Legacy: 'daily', 'weekly', 'biweekly', 'monthly', 'yearly'
  recurrenceEndDate: timestamp("recurrence_end_date"), // Legacy: end date
  recurrenceCount: varchar("recurrence_count"), // Legacy: occurrence count
  recurringEventId: varchar("recurring_event_id"), // Links instances to the parent/first event in the series
  rrule: text("rrule"), // RFC 5545 RRULE string (e.g. "FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=10")
  isRecurringParent: boolean("is_recurring_parent").default(false), // True if this is the template event for a series
  isImportant: boolean("is_important").notNull().default(false),
  googleEventId: text("google_event_id"), // Set when event was synced from Google Calendar
  googleCalendarId: text("google_calendar_id"), // Which Google calendar this event lives in (for two-way sync writes/deletes)
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Object-storage authorization resolves the owning event by photoUrl, so this
  // lookup must be indexed (it runs on every /objects/uploads/<id> fetch).
  photoUrlIdx: index("events_photo_url_idx").on(table.photoUrl),
}));

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
  messageType: varchar("message_type").notNull().default("family"), // 'family' = private, 'caregiver' = visible to caregivers
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
  isEnabled: boolean("is_enabled").notNull().default(true),
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

// Parsed Invoices table - invoices extracted from Gmail
export const parsedInvoices = pgTable("parsed_invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  familyId: varchar("family_id").notNull(),
  createdByUserId: varchar("created_by_user_id").notNull(),
  gmailMessageId: varchar("gmail_message_id").notNull(), // Gmail message ID to prevent duplicates
  subject: text("subject").notNull(),
  sender: text("sender").notNull(),
  senderEmail: text("sender_email"),
  amount: numeric("amount", { precision: 10, scale: 2 }),
  dueDate: timestamp("due_date"),
  category: varchar("category").notNull().default("other"), // 'utility', 'credit_card', 'subscription', 'medical', 'insurance', 'other'
  status: varchar("status").notNull().default("pending"), // 'pending', 'added_to_calendar', 'dismissed'
  eventId: varchar("event_id"), // If added to calendar, link to the event
  snippet: text("snippet"), // Email preview snippet
  receivedAt: timestamp("received_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
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

// Advisor Usage Tracking — per-user counters for beta analytics
export const advisorUsage = pgTable("advisor_usage", {
  userId: varchar("user_id").primaryKey(),
  totalMessages: integer("total_messages").notNull().default(0),
  totalGreetings: integer("total_greetings").notNull().default(0),
  totalConversations: integer("total_conversations").notNull().default(0),
  firstSeenAt: timestamp("first_seen_at").notNull().default(sql`now()`),
  lastMessageAt: timestamp("last_message_at"),
});

// API Keys — admin-generated tokens for external bot access to calendar data
export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key", { length: 64 }).notNull().unique(),
  name: text("name").notNull(),
  userId: text("user_id").notNull(),
  familyId: varchar("family_id"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  lastUsedAt: timestamp("last_used_at"),
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
  // photoUrl is intentionally NOT writable via generic event create/update.
  // It may only be set through PUT /api/events/:id/photo, which enforces that
  // the referenced object belongs to the caller's family. Allowing it here
  // would let a user bind their event to another family's (or an orphaned)
  // object path and read those bytes via the legacy object-read fallback.
  photoUrl: true,
}).extend({
  title: z.string().min(1, "Title is required").trim(),
  memberIds: z.array(z.string()),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  category: z.enum(EVENT_CATEGORIES).default('other'),
  recurrenceRule: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'yearly']).nullable().optional(),
  recurrenceEndDate: z.coerce.date().nullable().optional(),
  recurrenceCount: z.string().nullable().optional(),
  recurringEventId: z.string().nullable().optional(),
  rrule: z.string().nullable().optional(),
  isRecurringParent: z.boolean().nullable().optional(),
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

export const INVOICE_CATEGORIES = ['utility', 'credit_card', 'subscription', 'medical', 'insurance', 'other'] as const;
export type InvoiceCategory = typeof INVOICE_CATEGORIES[number];

export const INVOICE_STATUSES = ['pending', 'added_to_calendar', 'dismissed'] as const;
export type InvoiceStatus = typeof INVOICE_STATUSES[number];

export const insertParsedInvoiceSchema = createInsertSchema(parsedInvoices).omit({
  id: true,
  familyId: true,
  createdByUserId: true,
  status: true,
  eventId: true,
  createdAt: true,
}).extend({
  subject: z.string().min(1),
  sender: z.string().min(1),
  senderEmail: z.string().optional().nullable(),
  amount: z.number().positive().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  category: z.enum(INVOICE_CATEGORIES).default('other'),
  gmailMessageId: z.string().min(1),
  snippet: z.string().optional().nullable(),
  receivedAt: z.coerce.date().optional().nullable(),
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

// Push notification subscriptions
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type PushSubscription = typeof pushSubscriptions.$inferSelect;

export const betaFeedback = pgTable("beta_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  comments: text("comments").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBetaFeedbackSchema = createInsertSchema(betaFeedback).omit({ id: true, createdAt: true });
export type InsertBetaFeedback = z.infer<typeof insertBetaFeedbackSchema>;
export type BetaFeedback = typeof betaFeedback.$inferSelect;

// Symptom Tracker — daily health log entries
export const symptomEntries = pgTable("symptom_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  familyId: varchar("family_id").notNull(),
  memberId: varchar("member_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  moodEmoji: varchar("mood_emoji"), // e.g. '😄','🙂','😐','😔','😢','😤','😴','🤒'
  energyLevel: integer("energy_level"), // 1-10
  overallSeverity: integer("overall_severity"), // 1-10
  reactionFlag: varchar("reaction_flag").default("none"), // 'none','mild','moderate','severe','anaphylaxis'
  triggers: text("triggers").array(), // ['food','stress','heat',...]
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Per-entry body system severity ratings
export const symptomSystemRatings = pgTable("symptom_system_ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entryId: varchar("entry_id").notNull(),
  system: varchar("system").notNull(), // 'skin','gi','cardio','respiratory','neuro','musculo','mood'
  severity: integer("severity").notNull(), // 1-10
});

export const insertSymptomEntrySchema = createInsertSchema(symptomEntries).omit({ id: true, createdAt: true });
export type InsertSymptomEntry = z.infer<typeof insertSymptomEntrySchema>;
export type SymptomEntry = typeof symptomEntries.$inferSelect;

// Hydration Logs table - daily glass-of-water tracking per family member
export const hydrationLogs = pgTable("hydration_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  familyId: varchar("family_id").notNull(),
  memberId: varchar("member_id").notNull(),
  date: varchar("date").notNull(), // "YYYY-MM-DD"
  glassesCount: integer("glasses_count").notNull().default(0),
  goalGlasses: integer("goal_glasses").notNull().default(8),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertHydrationLogSchema = createInsertSchema(hydrationLogs).omit({ id: true, updatedAt: true });
export type InsertHydrationLog = z.infer<typeof insertHydrationLogSchema>;
export type HydrationLog = typeof hydrationLogs.$inferSelect;

export const kiraMemories = pgTable("kira_memories", {
  id: serial("id").primaryKey(),
  familyId: varchar("family_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
export type KiraMemory = typeof kiraMemories.$inferSelect;

// Google Calendar sync connections
export const googleCalendarConnections = pgTable("google_calendar_connections", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),
  refreshToken: text("refresh_token").notNull(),
  accessToken: text("access_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  selectedCalendarIds: text("selected_calendar_ids").array().notNull().default(sql`'{}'::text[]`),
  lastSyncedAt: timestamp("last_synced_at"),
  scope: text("scope"), // OAuth scopes granted (used to detect if two-way write access is available)
  pushEnabled: boolean("push_enabled").notNull().default(false), // When true, Kindora events are pushed to Google
  writeCalendarId: text("write_calendar_id").notNull().default("primary"), // Which Google calendar new Kindora events are written to
  createdAt: timestamp("created_at").defaultNow(),
});
export type GoogleCalendarConnection = typeof googleCalendarConnections.$inferSelect;
export const insertGoogleCalendarConnectionSchema = createInsertSchema(googleCalendarConnections).omit({ id: true, createdAt: true });
export type InsertGoogleCalendarConnection = z.infer<typeof insertGoogleCalendarConnectionSchema>;

export const googleDriveConnections = pgTable("google_drive_connections", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),
  refreshToken: text("refresh_token").notNull(),
  accessToken: text("access_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  googleEmail: text("google_email"),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
export type GoogleDriveConnection = typeof googleDriveConnections.$inferSelect;
export const insertGoogleDriveConnectionSchema = createInsertSchema(googleDriveConnections).omit({ id: true, createdAt: true });
export type InsertGoogleDriveConnection = z.infer<typeof insertGoogleDriveConnectionSchema>;

export const insertSymptomSystemRatingSchema = createInsertSchema(symptomSystemRatings).omit({ id: true });
export type InsertSymptomSystemRating = z.infer<typeof insertSymptomSystemRatingSchema>;
export type SymptomSystemRating = typeof symptomSystemRatings.$inferSelect;

export type SymptomEntryWithSystems = SymptomEntry & { systems: SymptomSystemRating[] };

// Tasks
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  familyId: varchar("family_id").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  assignedMemberId: varchar("assigned_member_id"),
  createdByUserId: varchar("created_by_user_id").notNull(),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  completedByUserId: varchar("completed_by_user_id"),
  priority: varchar("priority", { length: 20 }).default("normal"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, completedAt: true, completedByUserId: true, createdAt: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

// ── Chores & Rewards ────────────────────────────────────────────────────────
// Chores are kid-friendly tasks worth points. They can be one-time (dueDate) or
// recurring (rrule). Completing a chore for a member awards its points.
export const chores = pgTable("chores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  familyId: varchar("family_id").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  assignedMemberId: varchar("assigned_member_id"), // the family member responsible (usually a kid)
  points: integer("points").notNull().default(5),
  icon: varchar("icon", { length: 50 }), // optional icon key for kid-friendly display
  rrule: text("rrule"), // RFC 5545 RRULE for recurring chores; null = one-time
  dueDate: timestamp("due_date"), // one-time due date / recurrence anchor
  isActive: boolean("is_active").notNull().default(true),
  createdByUserId: varchar("created_by_user_id").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// One row per (chore, member, occurrence date) completion. Points are snapshotted
// so a chore's point value can change later without rewriting history.
export const choreCompletions = pgTable("chore_completions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  familyId: varchar("family_id").notNull(),
  choreId: varchar("chore_id").notNull(),
  memberId: varchar("member_id").notNull(), // who earned the points
  occurrenceDate: varchar("occurrence_date", { length: 10 }).notNull(), // YYYY-MM-DD
  pointsAwarded: integer("points_awarded").notNull(),
  completedByUserId: varchar("completed_by_user_id").notNull(),
  completedAt: timestamp("completed_at").notNull().default(sql`now()`),
}, (table) => ({
  uniqCompletion: uniqueIndex("chore_completions_unique")
    .on(table.choreId, table.memberId, table.occurrenceDate),
}));

// Rewards a member can redeem with points (family-wide store).
export const rewards = pgTable("rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  familyId: varchar("family_id").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  cost: integer("cost").notNull().default(10),
  icon: varchar("icon", { length: 50 }),
  isActive: boolean("is_active").notNull().default(true),
  createdByUserId: varchar("created_by_user_id").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// One row per redemption; pointsSpent decrements a member's balance.
export const rewardRedemptions = pgTable("reward_redemptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  familyId: varchar("family_id").notNull(),
  rewardId: varchar("reward_id").notNull(),
  memberId: varchar("member_id").notNull(),
  rewardTitle: varchar("reward_title", { length: 200 }).notNull(), // snapshot
  pointsSpent: integer("points_spent").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | fulfilled
  redeemedByUserId: varchar("redeemed_by_user_id").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertChoreSchema = createInsertSchema(chores).omit({
  id: true, createdAt: true,
}).extend({
  title: z.string().min(1, "Title is required").trim(),
  points: z.number().int().min(0).max(10000).default(5),
});
export type InsertChore = z.infer<typeof insertChoreSchema>;
export type Chore = typeof chores.$inferSelect;
export type ChoreCompletion = typeof choreCompletions.$inferSelect;

export const insertRewardSchema = createInsertSchema(rewards).omit({
  id: true, createdAt: true,
}).extend({
  title: z.string().min(1, "Title is required").trim(),
  cost: z.number().int().min(1).max(1000000).default(10),
});
export type InsertReward = z.infer<typeof insertRewardSchema>;
export type Reward = typeof rewards.$inferSelect;
export type RewardRedemption = typeof rewardRedemptions.$inferSelect;

// ── Meal Planner ────────────────────────────────────────────────────────────
// AI-generated weekly meal plans. The AI interviews the caregiver first, then
// produces a structured plan (days -> meals -> recipe) plus a consolidated,
// category-grouped grocery list. Both are stored as JSON snapshots.
export type MealPlanMeal = {
  mealType: string; // breakfast | lunch | dinner | snack
  name: string;
  description?: string;
  ingredients: string[];
  steps: string[];
};
export type MealPlanDay = {
  day: string; // e.g. "Monday" or "Day 1"
  meals: MealPlanMeal[];
};
export type GroceryCategory = {
  category: string; // e.g. "Produce", "Dairy", "Pantry"
  items: string[];
};

export const mealPlans = pgTable("meal_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  familyId: varchar("family_id").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  summary: text("summary"), // short friendly description of the plan
  days: jsonb("days").$type<MealPlanDay[]>().notNull(),
  groceryList: jsonb("grocery_list").$type<GroceryCategory[]>().notNull(),
  createdByUserId: varchar("created_by_user_id").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertMealPlanSchema = createInsertSchema(mealPlans).omit({
  id: true, createdAt: true,
}).extend({
  title: z.string().min(1, "Title is required").trim(),
});
export type InsertMealPlan = z.infer<typeof insertMealPlanSchema>;
export type MealPlan = typeof mealPlans.$inferSelect;

// Family Member types
export type InsertFamilyMember = z.infer<typeof insertFamilyMemberSchema>;
export type FamilyMember = typeof familyMembers.$inferSelect;

// Event types
export type InsertEvent = z.infer<typeof insertEventSchema>;
// photoUrl is omitted from InsertEvent for security (see insertEventSchema), but
// the dedicated photo endpoint (PUT /api/events/:id/photo) needs to set it.
export type UpdateEvent = Partial<InsertEvent> & { photoUrl?: string | null };
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

// Parsed Invoice types
export type InsertParsedInvoice = z.infer<typeof insertParsedInvoiceSchema>;
export type ParsedInvoice = typeof parsedInvoices.$inferSelect;

// Advisor Usage types
export type AdvisorUsage = typeof advisorUsage.$inferSelect;

// API Key types
export type ApiKey = typeof apiKeys.$inferSelect;

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
    canDeleteMessages: true,
    canManageMedications: true,
    canLogMedications: true,
    canViewMedications: true,
    canUploadDocuments: true,
    canDeleteDocuments: true,
    canViewDocuments: true,
    canManageEmergencyBridge: true,
    canManageWeeklySummary: true,
    canManageInvoices: true,
    canImportSchedules: true,
    canManagePayRates: true,
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
    canDeleteMessages: true,
    canManageMedications: true,
    canLogMedications: true,
    canViewMedications: true,
    canUploadDocuments: true,
    canDeleteDocuments: true,
    canViewDocuments: true,
    canManageEmergencyBridge: true,
    canManageWeeklySummary: true,
    canManageInvoices: true,
    canImportSchedules: true,
    canManagePayRates: false,
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
    canDeleteMessages: false,
    canManageMedications: false,
    canLogMedications: true,
    canViewMedications: true,
    canUploadDocuments: false,
    canDeleteDocuments: false,
    canViewDocuments: true,
    canManageEmergencyBridge: false,
    canManageWeeklySummary: false,
    canManageInvoices: false,
    canImportSchedules: false,
    canManagePayRates: false,
  },
} as const;

export type PermissionKey = keyof typeof ROLE_PERMISSIONS[FamilyRole];

export * from './models/chat';
