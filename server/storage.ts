import { type FamilyMember, type InsertFamilyMember, type Event, type InsertEvent, type Message, type InsertMessage, type User, type UpsertUser, type Family, type InsertFamily, type FamilyMembership, type EventNote, type InsertEventNote, type Medication, type InsertMedication, type MedicationLog, type InsertMedicationLog, type FamilyMessage, type InsertFamilyMessage, type CaregiverPayRate, type InsertCaregiverPayRate, type CaregiverTimeEntry, type InsertCaregiverTimeEntry, type WeeklySummarySchedule, type InsertWeeklySummarySchedule, type WeeklySummaryPreference, type InsertWeeklySummaryPreference, type CareDocument, type InsertCareDocument, type EmergencyBridgeToken, type ParsedInvoice, type InsertParsedInvoice, type AdvisorUsage, type BetaFeedback, type SymptomEntry, type InsertSymptomEntry, type SymptomSystemRating, type SymptomEntryWithSystems, type HydrationLog, familyMembers, events, messages, users, families, familyMemberships, eventNotes, medications, medicationLogs, familyMessages, caregiverPayRates, caregiverTimeEntries, weeklySummarySchedules, weeklySummaryPreferences, careDocuments, emergencyBridgeTokens, parsedInvoices, advisorUsage, betaFeedback, symptomEntries, symptomSystemRatings, hydrationLogs } from "@shared/schema";
import { randomUUID } from "crypto";
import pg from "pg";
const { Pool } = pg;
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and, inArray, isNull, desc, sql } from "drizzle-orm";

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export interface IStorage {
  // User operations (MANDATORY for auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserSubscription(userId: string, data: { stripeCustomerId?: string; stripeSubscriptionId?: string | null; subscriptionTier?: string; subscriptionStatus?: string }): Promise<User | undefined>;
  getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;

  // Family operations
  createFamily(userId: string, family: InsertFamily): Promise<Family>;
  updateFamily(familyId: string, updates: Partial<InsertFamily>): Promise<Family>;
  getUserFamily(userId: string): Promise<Family | undefined>;
  getUserFamilies(userId: string): Promise<Family[]>;
  getFamilyById(familyId: string): Promise<Family | undefined>;
  getFamilyByInviteCode(inviteCode: string): Promise<Family | undefined>;
  joinFamily(userId: string, inviteCode: string, role?: string): Promise<FamilyMembership>;
  getUserFamilyMembership(userId: string, familyId: string): Promise<FamilyMembership | undefined>;
  addUserToFamily(userId: string, familyId: string, role: string): Promise<FamilyMembership>;
  getFamilyMembershipsWithUsers(familyId: string): Promise<Array<FamilyMembership & { user: User }>>;
  leaveFamily(userId: string, familyId: string): Promise<void>;
  deleteFamily(familyId: string): Promise<void>;
  getFamilyMembers(familyId: string): Promise<FamilyMember[]>;
  getFamilyMember(id: string, familyId: string): Promise<FamilyMember | undefined>;
  createFamilyMember(familyId: string, member: InsertFamilyMember): Promise<FamilyMember>;
  updateFamilyMember(id: string, familyId: string, updates: Partial<FamilyMember>): Promise<FamilyMember>;
  deleteFamilyMember(id: string, familyId: string): Promise<void>;

  // Events
  getEvents(familyId: string): Promise<Event[]>;
  getEvent(id: string, familyId: string): Promise<Event | undefined>;
  createEvent(familyId: string, event: InsertEvent): Promise<Event>;
  updateEvent(id: string, familyId: string, event: Partial<InsertEvent>): Promise<Event>;
  deleteEvent(id: string, familyId: string): Promise<void>;
  toggleEventCompletion(id: string, familyId: string): Promise<Event>;

  // Messages
  getMessages(eventId: string, familyId: string): Promise<Message[]>;
  createMessage(familyId: string, message: InsertMessage): Promise<Message>;
  deleteMessage(id: string, familyId: string): Promise<void>;

  // Event Notes
  getEventNotes(eventId: string, familyId: string): Promise<EventNote[]>;
  getAllEventNotesForFamily(familyId: string): Promise<EventNote[]>;
  createEventNote(familyId: string, note: InsertEventNote): Promise<EventNote>;
  deleteEventNote(id: string, familyId: string): Promise<void>;

  // Medications
  getMedications(familyId: string): Promise<Medication[]>;
  getMedicationsByMember(memberId: string, familyId: string): Promise<Medication[]>;
  getMedication(id: string, familyId: string): Promise<Medication | undefined>;
  createMedication(familyId: string, medication: InsertMedication): Promise<Medication>;
  updateMedication(id: string, familyId: string, updates: Partial<Medication>): Promise<Medication>;
  deleteMedication(id: string, familyId: string): Promise<void>;

  // Medication Logs
  getMedicationLogs(medicationId: string, familyId: string): Promise<MedicationLog[]>;
  getTodaysMedicationLogs(familyId: string): Promise<MedicationLog[]>;
  createMedicationLog(familyId: string, log: InsertMedicationLog): Promise<MedicationLog>;

  // Family Messages (global conversation thread)
  getFamilyMessages(familyId: string): Promise<FamilyMessage[]>;
  createFamilyMessage(familyId: string, message: InsertFamilyMessage & { createdAt?: Date }): Promise<FamilyMessage>;
  deleteFamilyMessage(id: string, familyId: string): Promise<void>;

  // Caregiver Pay Rates
  getCaregiverPayRate(caregiverUserId: string, familyId: string): Promise<CaregiverPayRate | undefined>;
  setCaregiverPayRate(familyId: string, caregiverUserId: string, hourlyRate: string, currency?: string): Promise<CaregiverPayRate>;

  // Caregiver Time Entries
  getCaregiverTimeEntries(caregiverUserId: string, familyId: string): Promise<CaregiverTimeEntry[]>;
  createCaregiverTimeEntry(familyId: string, caregiverUserId: string, entry: InsertCaregiverTimeEntry, hourlyRate: string): Promise<CaregiverTimeEntry>;
  deleteCaregiverTimeEntry(id: string, caregiverUserId: string, familyId: string): Promise<void>;

  // Weekly Summary Schedule (admin configurable per family)
  getWeeklySummarySchedule(familyId: string): Promise<WeeklySummarySchedule | undefined>;
  upsertWeeklySummarySchedule(familyId: string, schedule: Partial<InsertWeeklySummarySchedule>): Promise<WeeklySummarySchedule>;
  getActiveWeeklySummarySchedules(): Promise<WeeklySummarySchedule[]>;
  updateWeeklySummaryLastSent(familyId: string): Promise<void>;

  // Weekly Summary Preferences (user opt-in per family)
  getWeeklySummaryPreference(userId: string, familyId: string): Promise<WeeklySummaryPreference | undefined>;
  upsertWeeklySummaryPreference(userId: string, familyId: string, optedIn: boolean): Promise<WeeklySummaryPreference>;
  getOptedInUsersForFamily(familyId: string): Promise<Array<{ userId: string; user: User }>>;

  // Care Documents
  getCareDocuments(familyId: string): Promise<CareDocument[]>;
  getCareDocumentsByMember(memberId: string, familyId: string): Promise<CareDocument[]>;
  getCareDocument(id: string, familyId: string): Promise<CareDocument | undefined>;
  createCareDocument(familyId: string, document: InsertCareDocument): Promise<CareDocument>;
  deleteCareDocument(id: string, familyId: string): Promise<void>;

  // Emergency Bridge Tokens
  getEmergencyBridgeTokens(familyId: string): Promise<EmergencyBridgeToken[]>;
  getEmergencyBridgeTokenByHash(tokenHash: string): Promise<EmergencyBridgeToken | undefined>;
  createEmergencyBridgeToken(familyId: string, createdByUserId: string, tokenHash: string, expiresAt: Date, label?: string | null): Promise<EmergencyBridgeToken>;
  revokeEmergencyBridgeToken(id: string, familyId: string): Promise<void>;
  incrementEmergencyBridgeTokenAccess(id: string): Promise<void>;

  // Parsed Invoices (Gmail integration)
  getParsedInvoices(familyId: string): Promise<ParsedInvoice[]>;
  getParsedInvoiceByMessageId(gmailMessageId: string, familyId: string): Promise<ParsedInvoice | undefined>;
  createParsedInvoice(familyId: string, userId: string, invoice: Omit<InsertParsedInvoice, 'familyId' | 'createdByUserId'>): Promise<ParsedInvoice>;
  updateParsedInvoiceStatus(id: string, familyId: string, status: string, eventId?: string): Promise<ParsedInvoice>;
  deleteParsedInvoice(id: string, familyId: string): Promise<void>;

  // Advisor Usage Tracking (beta analytics)
  trackAdvisorMessage(userId: string): Promise<void>;
  trackAdvisorGreeting(userId: string): Promise<void>;
  trackAdvisorConversation(userId: string): Promise<void>;
  getAdvisorUsage(userId: string): Promise<AdvisorUsage | undefined>;
  getAllAdvisorUsage(): Promise<AdvisorUsage[]>;

  // Beta Feedback
  submitBetaFeedback(data: { userId?: string; name: string; email: string; comments: string }): Promise<BetaFeedback>;
  getAllBetaFeedback(): Promise<BetaFeedback[]>;

  // Admin
  getAllUsers(): Promise<User[]>;
  getAdminStats(): Promise<{ totalUsers: number; totalFamilies: number; totalEvents: number; totalFeedback: number }>;

  // Symptom Tracker
  createSymptomEntry(entry: InsertSymptomEntry, systems: { system: string; severity: number }[]): Promise<SymptomEntryWithSystems>;
  getSymptomEntries(familyId: string, memberId?: string, startDate?: string, endDate?: string): Promise<SymptomEntryWithSystems[]>;
  getSymptomEntry(id: string): Promise<SymptomEntryWithSystems | undefined>;
  updateSymptomEntry(id: string, entry: Partial<InsertSymptomEntry>, systems?: { system: string; severity: number }[]): Promise<SymptomEntryWithSystems>;
  deleteSymptomEntry(id: string): Promise<void>;

  // Hydration Tracking
  getHydrationLogs(familyId: string, date: string): Promise<HydrationLog[]>;
  upsertHydrationLog(data: { familyId: string; memberId: string; date: string; glassesCount: number; goalGlasses: number }): Promise<HydrationLog>;
}

export class MemStorage implements IStorage {
  private familyMembers: Map<string, FamilyMember>;
  private events: Map<string, Event>;
  private messages: Map<string, Message>;
  private users: Map<string, User>;
  private families: Map<string, Family>;
  private familyMemberships: Map<string, FamilyMembership>;
  private eventNotesMap: Map<string, EventNote>;
  private medicationsMap: Map<string, Medication>;
  private medicationLogsMap: Map<string, MedicationLog>;
  private familyMessagesMap: Map<string, FamilyMessage>;
  private caregiverPayRatesMap: Map<string, CaregiverPayRate>;
  private caregiverTimeEntriesMap: Map<string, CaregiverTimeEntry>;
  private careDocumentsMap: Map<string, CareDocument>;
  private emergencyBridgeTokensMap: Map<string, EmergencyBridgeToken>;
  private symptomEntriesMap: Map<string, SymptomEntry>;
  private symptomSystemRatingsMap: Map<string, SymptomSystemRating>;
  private hydrationLogsMap: Map<string, HydrationLog>;

  constructor() {
    this.familyMembers = new Map();
    this.events = new Map();
    this.messages = new Map();
    this.users = new Map();
    this.families = new Map();
    this.familyMemberships = new Map();
    this.eventNotesMap = new Map();
    this.medicationsMap = new Map();
    this.medicationLogsMap = new Map();
    this.familyMessagesMap = new Map();
    this.caregiverPayRatesMap = new Map();
    this.caregiverTimeEntriesMap = new Map();
    this.careDocumentsMap = new Map();
    this.emergencyBridgeTokensMap = new Map();
    this.symptomEntriesMap = new Map();
    this.symptomSystemRatingsMap = new Map();
    this.hydrationLogsMap = new Map();
  }
  
  private generateInviteCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  
  private async ensureUserFamily(userId: string): Promise<string> {
    const membership = Array.from(this.familyMemberships.values()).find(m => m.userId === userId);
    if (membership) {
      return membership.familyId;
    }
    
    const user = this.users.get(userId);
    const familyName = user?.firstName ? `${user.firstName}'s Family` : "My Family";
    
    const family = await this.createFamily(userId, { name: familyName, createdBy: userId });
    return family.id;
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.email === email);
  }

  async upsertUser(user: UpsertUser): Promise<User> {
    const id = user.id;
    const existingUser = this.users.get(id);
    const userData: User = {
      id,
      email: user.email ?? existingUser?.email ?? null,
      firstName: user.firstName ?? existingUser?.firstName ?? null,
      lastName: user.lastName ?? existingUser?.lastName ?? null,
      profileImageUrl: user.profileImageUrl ?? existingUser?.profileImageUrl ?? null,
      passwordHash: user.passwordHash ?? existingUser?.passwordHash ?? null,
      authProvider: user.authProvider ?? existingUser?.authProvider ?? "local",
      stripeCustomerId: existingUser?.stripeCustomerId ?? null,
      stripeSubscriptionId: existingUser?.stripeSubscriptionId ?? null,
      subscriptionTier: existingUser?.subscriptionTier ?? "free",
      subscriptionStatus: existingUser?.subscriptionStatus ?? "inactive",
      createdAt: existingUser?.createdAt || new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, userData);
    
    return userData;
  }

  async updateUserSubscription(userId: string, data: { stripeCustomerId?: string; stripeSubscriptionId?: string | null; subscriptionTier?: string; subscriptionStatus?: string }): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    const updated: User = {
      ...user,
      stripeCustomerId: data.stripeCustomerId ?? user.stripeCustomerId,
      stripeSubscriptionId: data.stripeSubscriptionId !== undefined ? data.stripeSubscriptionId : user.stripeSubscriptionId,
      subscriptionTier: data.subscriptionTier ?? user.subscriptionTier,
      subscriptionStatus: data.subscriptionStatus ?? user.subscriptionStatus,
      updatedAt: new Date(),
    };
    this.users.set(userId, updated);
    return updated;
  }

  async getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.stripeCustomerId === stripeCustomerId);
  }

  async deleteUser(id: string): Promise<void> {
    this.users.delete(id);
  }

  // Family operations
  async createFamily(userId: string, familyData: InsertFamily): Promise<Family> {
    let inviteCode = this.generateInviteCode();
    while (Array.from(this.families.values()).some(f => f.inviteCode === inviteCode)) {
      inviteCode = this.generateInviteCode();
    }
    
    const id = randomUUID();
    const family: Family = {
      ...familyData,
      id,
      inviteCode,
      createdAt: new Date(),
      advisorChildrenContext: familyData.advisorChildrenContext ?? null,
      advisorElderContext: familyData.advisorElderContext ?? null,
      advisorSelfContext: familyData.advisorSelfContext ?? null,
    };
    this.families.set(id, family);
    
    const membershipId = randomUUID();
    const membership: FamilyMembership = {
      id: membershipId,
      userId,
      familyId: id,
      role: 'owner',
      joinedAt: new Date(),
    };
    this.familyMemberships.set(membershipId, membership);
    
    return family;
  }

  async updateFamily(familyId: string, updates: Partial<InsertFamily>): Promise<Family> {
    const family = this.families.get(familyId);
    if (!family) {
      throw new NotFoundError(`Family not found: ${familyId}`);
    }
    const updatedFamily: Family = { ...family, ...updates };
    this.families.set(familyId, updatedFamily);
    return updatedFamily;
  }

  async getUserFamily(userId: string): Promise<Family | undefined> {
    const membership = Array.from(this.familyMemberships.values()).find(m => m.userId === userId);
    if (!membership) {
      return undefined;
    }
    return this.families.get(membership.familyId);
  }

  async getFamilyByInviteCode(inviteCode: string): Promise<Family | undefined> {
    return Array.from(this.families.values()).find(f => f.inviteCode === inviteCode);
  }

  async joinFamily(userId: string, inviteCode: string, role: string = 'member'): Promise<FamilyMembership> {
    const family = await this.getFamilyByInviteCode(inviteCode);
    if (!family) {
      throw new NotFoundError(`Family with invite code ${inviteCode} not found`);
    }
    
    // Check if user is already a member of this family
    const existingMembership = Array.from(this.familyMemberships.values())
      .find(m => m.userId === userId && m.familyId === family.id);
    
    if (existingMembership) {
      return existingMembership;
    }
    
    // Create new membership (user can belong to multiple families now)
    const id = randomUUID();
    const membership: FamilyMembership = {
      id,
      userId,
      familyId: family.id,
      role,
      joinedAt: new Date(),
    };
    this.familyMemberships.set(id, membership);
    
    return membership;
  }
  
  async getUserFamilyMembership(userId: string, familyId: string): Promise<FamilyMembership | undefined> {
    return Array.from(this.familyMemberships.values())
      .find(m => m.userId === userId && m.familyId === familyId);
  }

  async addUserToFamily(userId: string, familyId: string, role: string): Promise<FamilyMembership> {
    const existing = await this.getUserFamilyMembership(userId, familyId);
    if (existing) return existing;
    
    const membership: FamilyMembership = {
      id: randomUUID(),
      userId,
      familyId,
      role,
      joinedAt: new Date(),
    };
    this.familyMemberships.set(membership.id, membership);
    return membership;
  }

  async leaveFamily(userId: string, familyId: string): Promise<void> {
    const membershipToDelete = Array.from(this.familyMemberships.entries())
      .find(([_, m]) => m.userId === userId && m.familyId === familyId);
    if (membershipToDelete) {
      this.familyMemberships.delete(membershipToDelete[0]);
    }
  }

  async deleteFamily(familyId: string): Promise<void> {
    // Delete all memberships for this family
    const idsToDelete = Array.from(this.familyMemberships.entries())
      .filter(([_, m]) => m.familyId === familyId)
      .map(([id]) => id);
    idsToDelete.forEach(id => this.familyMemberships.delete(id));
    // Delete the family itself
    this.families.delete(familyId);
  }

  async getFamilyMembershipsWithUsers(familyId: string): Promise<Array<FamilyMembership & { user: User }>> {
    const memberships = Array.from(this.familyMemberships.values())
      .filter(m => m.familyId === familyId);
    
    return memberships.map(membership => {
      const user = this.users.get(membership.userId);
      if (!user) {
        throw new Error(`User ${membership.userId} not found`);
      }
      return { ...membership, user };
    });
  }

  async getUserFamilies(userId: string): Promise<Family[]> {
    const memberships = Array.from(this.familyMemberships.values())
      .filter(m => m.userId === userId);
    const familyIds = memberships.map(m => m.familyId);
    return Array.from(this.families.values())
      .filter(f => familyIds.includes(f.id));
  }

  async getFamilyById(familyId: string): Promise<Family | undefined> {
    return this.families.get(familyId);
  }

  // Family Members
  async getFamilyMembers(familyId: string): Promise<FamilyMember[]> {
    return Array.from(this.familyMembers.values()).filter(m => m.familyId === familyId);
  }

  async getFamilyMember(id: string, familyId: string): Promise<FamilyMember | undefined> {
    const member = this.familyMembers.get(id);
    return member && member.familyId === familyId ? member : undefined;
  }

  async createFamilyMember(familyId: string, insertMember: InsertFamilyMember): Promise<FamilyMember> {
    const id = randomUUID();
    const member: FamilyMember = { 
      id, 
      name: insertMember.name,
      color: insertMember.color,
      avatar: insertMember.avatar ?? null,
      role: insertMember.role ?? "family",
      familyId,
      createdAt: new Date(),
    };
    this.familyMembers.set(id, member);
    return member;
  }

  async updateFamilyMember(id: string, familyId: string, updates: Partial<FamilyMember>): Promise<FamilyMember> {
    const existingMember = this.familyMembers.get(id);
    if (!existingMember || existingMember.familyId !== familyId) {
      throw new NotFoundError(`Family member with id ${id} not found`);
    }
    
    const updatedMember: FamilyMember = {
      ...existingMember,
      ...updates,
      id,
      familyId,
    };
    this.familyMembers.set(id, updatedMember);
    return updatedMember;
  }

  async deleteFamilyMember(id: string, familyId: string): Promise<void> {
    const member = this.familyMembers.get(id);
    if (!member || member.familyId !== familyId) {
      throw new NotFoundError(`Family member with id ${id} not found`);
    }
    
    this.familyMembers.delete(id);
    
    const eventsToUpdate = Array.from(this.events.entries())
      .filter(([_, event]) => event.memberIds.includes(id) && event.familyId === familyId);
    
    eventsToUpdate.forEach(([eventId, event]) => {
      const updatedMemberIds = event.memberIds.filter(memberId => memberId !== id);
      if (updatedMemberIds.length === 0) {
        this.events.delete(eventId);
        
        const messagesToDelete = Array.from(this.messages.entries())
          .filter(([_, message]) => message.eventId === eventId && message.familyId === familyId)
          .map(([messageId, _]) => messageId);
        
        messagesToDelete.forEach(messageId => this.messages.delete(messageId));
      } else {
        this.events.set(eventId, { ...event, memberIds: updatedMemberIds });
      }
    });
  }

  // Events
  async getEvents(familyId: string): Promise<Event[]> {
    return Array.from(this.events.values()).filter(e => e.familyId === familyId);
  }

  async getEvent(id: string, familyId: string): Promise<Event | undefined> {
    const event = this.events.get(id);
    return event && event.familyId === familyId ? event : undefined;
  }

  async createEvent(familyId: string, insertEvent: InsertEvent): Promise<Event> {
    const id = randomUUID();
    const event: Event = {
      ...insertEvent,
      id,
      familyId,
      description: insertEvent.description || null,
      photoUrl: insertEvent.photoUrl || null,
      recurrenceRule: insertEvent.recurrenceRule ?? null,
      recurrenceEndDate: insertEvent.recurrenceEndDate ?? null,
      recurringEventId: insertEvent.recurringEventId ?? null,
      recurrenceCount: insertEvent.recurrenceCount ?? null,
      rrule: insertEvent.rrule ?? null,
      isRecurringParent: insertEvent.isRecurringParent ?? null,
      isImportant: insertEvent.isImportant ?? false,
      completed: false,
      completedAt: null,
      createdAt: new Date(),
    };
    this.events.set(id, event);
    return event;
  }

  async updateEvent(id: string, familyId: string, updateData: Partial<InsertEvent>): Promise<Event> {
    const existingEvent = this.events.get(id);
    if (!existingEvent || existingEvent.familyId !== familyId) {
      throw new NotFoundError(`Event with id ${id} not found`);
    }
    
    const updatedEvent: Event = {
      ...existingEvent,
      id,
      familyId,
      title: updateData.title !== undefined ? updateData.title : existingEvent.title,
      startTime: updateData.startTime ? new Date(updateData.startTime) : existingEvent.startTime,
      endTime: updateData.endTime ? new Date(updateData.endTime) : existingEvent.endTime,
      memberIds: updateData.memberIds !== undefined ? updateData.memberIds : existingEvent.memberIds,
      color: updateData.color !== undefined ? updateData.color : existingEvent.color,
      description: updateData.description !== undefined ? updateData.description : existingEvent.description,
      photoUrl: updateData.photoUrl !== undefined ? updateData.photoUrl : existingEvent.photoUrl,
      completed: existingEvent.completed,
      completedAt: existingEvent.completedAt,
      createdAt: existingEvent.createdAt,
    };
    this.events.set(id, updatedEvent);
    return updatedEvent;
  }

  async deleteEvent(id: string, familyId: string): Promise<void> {
    const event = this.events.get(id);
    if (!event || event.familyId !== familyId) {
      throw new NotFoundError(`Event with id ${id} not found`);
    }
    
    this.events.delete(id);
    
    const messagesToDelete = Array.from(this.messages.entries())
      .filter(([_, message]) => message.eventId === id && message.familyId === familyId)
      .map(([messageId, _]) => messageId);
    
    messagesToDelete.forEach(messageId => this.messages.delete(messageId));
  }

  async toggleEventCompletion(id: string, familyId: string): Promise<Event> {
    const event = this.events.get(id);
    if (!event || event.familyId !== familyId) {
      throw new NotFoundError(`Event with id ${id} not found`);
    }
    
    const updatedEvent: Event = {
      ...event,
      completed: !event.completed,
      completedAt: !event.completed ? new Date() : null,
    };
    this.events.set(id, updatedEvent);
    return updatedEvent;
  }

  // Messages
  async getMessages(eventId: string, familyId: string): Promise<Message[]> {
    return Array.from(this.messages.values()).filter(m => m.eventId === eventId && m.familyId === familyId);
  }

  async createMessage(familyId: string, insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      ...insertMessage,
      id,
      familyId,
      createdAt: new Date(),
    };
    this.messages.set(id, message);
    return message;
  }

  async deleteMessage(id: string, familyId: string): Promise<void> {
    const message = this.messages.get(id);
    if (!message || message.familyId !== familyId) {
      throw new NotFoundError(`Message with id ${id} not found`);
    }
    this.messages.delete(id);
  }

  // Event Notes
  async getEventNotes(eventId: string, familyId: string): Promise<EventNote[]> {
    return Array.from(this.eventNotesMap.values())
      .filter(n => n.eventId === eventId && n.familyId === familyId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async getAllEventNotesForFamily(familyId: string): Promise<EventNote[]> {
    return Array.from(this.eventNotesMap.values())
      .filter(n => n.familyId === familyId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async createEventNote(familyId: string, insertNote: InsertEventNote): Promise<EventNote> {
    const id = randomUUID();
    const note: EventNote = {
      ...insertNote,
      id,
      familyId,
      parentNoteId: insertNote.parentNoteId || null,
      createdAt: new Date(),
    };
    this.eventNotesMap.set(id, note);
    return note;
  }

  async deleteEventNote(id: string, familyId: string): Promise<void> {
    const note = this.eventNotesMap.get(id);
    if (!note || note.familyId !== familyId) {
      throw new NotFoundError(`Event note with id ${id} not found`);
    }
    this.eventNotesMap.delete(id);
    
    // Also delete all replies to this note
    const replies = Array.from(this.eventNotesMap.values())
      .filter(n => n.parentNoteId === id);
    replies.forEach(reply => this.eventNotesMap.delete(reply.id));
  }

  // Medications
  async getMedications(familyId: string): Promise<Medication[]> {
    return Array.from(this.medicationsMap.values())
      .filter(m => m.familyId === familyId && m.isActive);
  }

  async getMedicationsByMember(memberId: string, familyId: string): Promise<Medication[]> {
    return Array.from(this.medicationsMap.values())
      .filter(m => m.memberId === memberId && m.familyId === familyId && m.isActive);
  }

  async getMedication(id: string, familyId: string): Promise<Medication | undefined> {
    const med = this.medicationsMap.get(id);
    return med && med.familyId === familyId ? med : undefined;
  }

  async createMedication(familyId: string, insertMedication: InsertMedication): Promise<Medication> {
    const id = randomUUID();
    const medication: Medication = {
      ...insertMedication,
      id,
      familyId,
      instructions: insertMedication.instructions || null,
      scheduledTimes: insertMedication.scheduledTimes || null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.medicationsMap.set(id, medication);
    return medication;
  }

  async updateMedication(id: string, familyId: string, updates: Partial<Medication>): Promise<Medication> {
    const existing = this.medicationsMap.get(id);
    if (!existing || existing.familyId !== familyId) {
      throw new NotFoundError(`Medication with id ${id} not found`);
    }
    const updated: Medication = {
      ...existing,
      ...updates,
      id,
      familyId,
      updatedAt: new Date(),
    };
    this.medicationsMap.set(id, updated);
    return updated;
  }

  async deleteMedication(id: string, familyId: string): Promise<void> {
    const med = this.medicationsMap.get(id);
    if (!med || med.familyId !== familyId) {
      throw new NotFoundError(`Medication with id ${id} not found`);
    }
    // Soft delete by setting isActive to false
    this.medicationsMap.set(id, { ...med, isActive: false, updatedAt: new Date() });
  }

  // Medication Logs
  async getMedicationLogs(medicationId: string, familyId: string): Promise<MedicationLog[]> {
    return Array.from(this.medicationLogsMap.values())
      .filter(l => l.medicationId === medicationId && l.familyId === familyId)
      .sort((a, b) => new Date(b.administeredAt).getTime() - new Date(a.administeredAt).getTime());
  }

  async getTodaysMedicationLogs(familyId: string): Promise<MedicationLog[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return Array.from(this.medicationLogsMap.values())
      .filter(l => {
        const logDate = new Date(l.administeredAt);
        return l.familyId === familyId && logDate >= today && logDate < tomorrow;
      })
      .sort((a, b) => new Date(b.administeredAt).getTime() - new Date(a.administeredAt).getTime());
  }

  async createMedicationLog(familyId: string, insertLog: InsertMedicationLog): Promise<MedicationLog> {
    const id = randomUUID();
    const log: MedicationLog = {
      ...insertLog,
      id,
      familyId,
      scheduledTime: insertLog.scheduledTime || null,
      notes: insertLog.notes || null,
      createdAt: new Date(),
    };
    this.medicationLogsMap.set(id, log);
    return log;
  }

  // Family Messages
  async getFamilyMessages(familyId: string): Promise<FamilyMessage[]> {
    return Array.from(this.familyMessagesMap.values())
      .filter(m => m.familyId === familyId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async createFamilyMessage(familyId: string, insertMessage: InsertFamilyMessage & { createdAt?: Date }): Promise<FamilyMessage> {
    const id = randomUUID();
    const message: FamilyMessage = {
      id,
      familyId,
      authorUserId: insertMessage.authorUserId,
      content: insertMessage.content,
      parentMessageId: insertMessage.parentMessageId ?? null,
      createdAt: insertMessage.createdAt || new Date(),
    };
    this.familyMessagesMap.set(id, message);
    return message;
  }

  async deleteFamilyMessage(id: string, familyId: string): Promise<void> {
    const message = this.familyMessagesMap.get(id);
    if (!message || message.familyId !== familyId) {
      throw new NotFoundError(`Family message with id ${id} not found`);
    }
    this.familyMessagesMap.delete(id);
  }

  // Caregiver Pay Rates
  async getCaregiverPayRate(caregiverUserId: string, familyId: string): Promise<CaregiverPayRate | undefined> {
    return Array.from(this.caregiverPayRatesMap.values()).find(
      r => r.caregiverUserId === caregiverUserId && r.familyId === familyId
    );
  }

  async setCaregiverPayRate(familyId: string, caregiverUserId: string, hourlyRate: string, currency: string = "USD"): Promise<CaregiverPayRate> {
    const existing = await this.getCaregiverPayRate(caregiverUserId, familyId);
    
    if (existing) {
      const updated: CaregiverPayRate = {
        ...existing,
        hourlyRate,
        currency,
        updatedAt: new Date(),
      };
      this.caregiverPayRatesMap.set(existing.id, updated);
      return updated;
    }

    const id = randomUUID();
    const payRate: CaregiverPayRate = {
      id,
      familyId,
      caregiverUserId,
      hourlyRate,
      currency,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.caregiverPayRatesMap.set(id, payRate);
    return payRate;
  }

  // Caregiver Time Entries
  async getCaregiverTimeEntries(caregiverUserId: string, familyId: string): Promise<CaregiverTimeEntry[]> {
    return Array.from(this.caregiverTimeEntriesMap.values())
      .filter(e => e.caregiverUserId === caregiverUserId && e.familyId === familyId)
      .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
  }

  async createCaregiverTimeEntry(familyId: string, caregiverUserId: string, entry: InsertCaregiverTimeEntry, hourlyRate: string): Promise<CaregiverTimeEntry> {
    const id = randomUUID();
    const hours = parseFloat(entry.hoursWorked);
    const rate = parseFloat(hourlyRate);
    const calculatedPay = (hours * rate).toFixed(2);

    const timeEntry: CaregiverTimeEntry = {
      id,
      familyId,
      caregiverUserId,
      hoursWorked: entry.hoursWorked,
      entryDate: entry.entryDate,
      notes: entry.notes || null,
      hourlyRateAtTime: hourlyRate,
      calculatedPay,
      createdAt: new Date(),
    };
    this.caregiverTimeEntriesMap.set(id, timeEntry);
    return timeEntry;
  }

  async deleteCaregiverTimeEntry(id: string, caregiverUserId: string, familyId: string): Promise<void> {
    const entry = this.caregiverTimeEntriesMap.get(id);
    if (!entry || entry.caregiverUserId !== caregiverUserId || entry.familyId !== familyId) {
      throw new NotFoundError(`Time entry with id ${id} not found`);
    }
    this.caregiverTimeEntriesMap.delete(id);
  }

  // Weekly Summary Schedule - In-memory storage (for demo mode)
  private weeklySummarySchedulesMap: Map<string, WeeklySummarySchedule> = new Map();
  private weeklySummaryPreferencesMap: Map<string, WeeklySummaryPreference> = new Map();

  async getWeeklySummarySchedule(familyId: string): Promise<WeeklySummarySchedule | undefined> {
    return Array.from(this.weeklySummarySchedulesMap.values()).find(s => s.familyId === familyId);
  }

  async upsertWeeklySummarySchedule(familyId: string, schedule: Partial<InsertWeeklySummarySchedule>): Promise<WeeklySummarySchedule> {
    const existing = await this.getWeeklySummarySchedule(familyId);
    if (existing) {
      const updated: WeeklySummarySchedule = {
        ...existing,
        ...schedule,
        updatedAt: new Date(),
      };
      this.weeklySummarySchedulesMap.set(existing.id, updated);
      return updated;
    }
    const id = randomUUID();
    const newSchedule: WeeklySummarySchedule = {
      id,
      familyId,
      isEnabled: schedule.isEnabled ?? false,
      dayOfWeek: schedule.dayOfWeek ?? '0',
      timeOfDay: schedule.timeOfDay ?? '08:00',
      timezone: schedule.timezone ?? 'America/New_York',
      lastSentAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.weeklySummarySchedulesMap.set(id, newSchedule);
    return newSchedule;
  }

  async getActiveWeeklySummarySchedules(): Promise<WeeklySummarySchedule[]> {
    return Array.from(this.weeklySummarySchedulesMap.values()).filter(s => s.isEnabled);
  }

  async updateWeeklySummaryLastSent(familyId: string): Promise<void> {
    const schedule = await this.getWeeklySummarySchedule(familyId);
    if (schedule) {
      schedule.lastSentAt = new Date();
      this.weeklySummarySchedulesMap.set(schedule.id, schedule);
    }
  }

  async getWeeklySummaryPreference(userId: string, familyId: string): Promise<WeeklySummaryPreference | undefined> {
    return Array.from(this.weeklySummaryPreferencesMap.values()).find(p => p.userId === userId && p.familyId === familyId);
  }

  async upsertWeeklySummaryPreference(userId: string, familyId: string, optedIn: boolean): Promise<WeeklySummaryPreference> {
    const existing = await this.getWeeklySummaryPreference(userId, familyId);
    if (existing) {
      const updated: WeeklySummaryPreference = {
        ...existing,
        optedIn,
        updatedAt: new Date(),
      };
      this.weeklySummaryPreferencesMap.set(existing.id, updated);
      return updated;
    }
    const id = randomUUID();
    const newPref: WeeklySummaryPreference = {
      id,
      userId,
      familyId,
      optedIn,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.weeklySummaryPreferencesMap.set(id, newPref);
    return newPref;
  }

  async getOptedInUsersForFamily(familyId: string): Promise<Array<{ userId: string; user: User }>> {
    const prefs = Array.from(this.weeklySummaryPreferencesMap.values()).filter(p => p.familyId === familyId && p.optedIn);
    const result: Array<{ userId: string; user: User }> = [];
    for (const pref of prefs) {
      const user = this.users.get(pref.userId);
      if (user) {
        result.push({ userId: pref.userId, user });
      }
    }
    return result;
  }

  // Care Documents
  async getCareDocuments(familyId: string): Promise<CareDocument[]> {
    return Array.from(this.careDocumentsMap.values())
      .filter(d => d.familyId === familyId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getCareDocumentsByMember(memberId: string, familyId: string): Promise<CareDocument[]> {
    return Array.from(this.careDocumentsMap.values())
      .filter(d => d.memberId === memberId && d.familyId === familyId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getCareDocument(id: string, familyId: string): Promise<CareDocument | undefined> {
    const doc = this.careDocumentsMap.get(id);
    return doc && doc.familyId === familyId ? doc : undefined;
  }

  async createCareDocument(familyId: string, insertDoc: InsertCareDocument): Promise<CareDocument> {
    const id = randomUUID();
    const document: CareDocument = {
      ...insertDoc,
      id,
      familyId,
      memberId: insertDoc.memberId || null,
      description: insertDoc.description || null,
      fileSize: insertDoc.fileSize || null,
      mimeType: insertDoc.mimeType || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.careDocumentsMap.set(id, document);
    return document;
  }

  async deleteCareDocument(id: string, familyId: string): Promise<void> {
    const doc = this.careDocumentsMap.get(id);
    if (!doc || doc.familyId !== familyId) {
      throw new NotFoundError(`Care document with id ${id} not found`);
    }
    this.careDocumentsMap.delete(id);
  }

  // Emergency Bridge Token methods
  async getEmergencyBridgeTokens(familyId: string): Promise<EmergencyBridgeToken[]> {
    return Array.from(this.emergencyBridgeTokensMap.values())
      .filter(t => t.familyId === familyId && t.status === 'active');
  }

  async getEmergencyBridgeTokenByHash(tokenHash: string): Promise<EmergencyBridgeToken | undefined> {
    return Array.from(this.emergencyBridgeTokensMap.values())
      .find(t => t.tokenHash === tokenHash);
  }

  async createEmergencyBridgeToken(
    familyId: string,
    createdByUserId: string,
    tokenHash: string,
    expiresAt: Date,
    label?: string | null
  ): Promise<EmergencyBridgeToken> {
    const id = randomUUID();
    const token: EmergencyBridgeToken = {
      id,
      familyId,
      tokenHash,
      createdByUserId,
      label: label ?? null,
      expiresAt,
      status: 'active',
      accessCount: 0,
      lastAccessedAt: null,
      createdAt: new Date(),
    };
    this.emergencyBridgeTokensMap.set(id, token);
    return token;
  }

  async revokeEmergencyBridgeToken(id: string, familyId: string): Promise<void> {
    const token = this.emergencyBridgeTokensMap.get(id);
    if (!token || token.familyId !== familyId) {
      throw new NotFoundError(`Emergency bridge token with id ${id} not found`);
    }
    token.status = 'revoked';
    this.emergencyBridgeTokensMap.set(id, token);
  }

  async incrementEmergencyBridgeTokenAccess(id: string): Promise<void> {
    const token = this.emergencyBridgeTokensMap.get(id);
    if (token) {
      token.accessCount = (token.accessCount || 0) + 1;
      token.lastAccessedAt = new Date();
      this.emergencyBridgeTokensMap.set(id, token);
    }
  }

  // Parsed Invoices
  private parsedInvoicesMap: Map<string, ParsedInvoice> = new Map();

  async getParsedInvoices(familyId: string): Promise<ParsedInvoice[]> {
    return Array.from(this.parsedInvoicesMap.values())
      .filter(i => i.familyId === familyId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getParsedInvoiceByMessageId(gmailMessageId: string, familyId: string): Promise<ParsedInvoice | undefined> {
    return Array.from(this.parsedInvoicesMap.values())
      .find(i => i.gmailMessageId === gmailMessageId && i.familyId === familyId);
  }

  async createParsedInvoice(familyId: string, userId: string, invoice: Omit<InsertParsedInvoice, 'familyId' | 'createdByUserId'>): Promise<ParsedInvoice> {
    const id = randomUUID();
    const newInvoice: ParsedInvoice = {
      id,
      familyId,
      createdByUserId: userId,
      gmailMessageId: invoice.gmailMessageId,
      subject: invoice.subject,
      sender: invoice.sender,
      senderEmail: invoice.senderEmail ?? null,
      amount: invoice.amount ? String(invoice.amount) : null,
      dueDate: invoice.dueDate ?? null,
      category: invoice.category || 'other',
      status: 'pending',
      eventId: null,
      snippet: invoice.snippet ?? null,
      receivedAt: invoice.receivedAt ?? null,
      createdAt: new Date(),
    };
    this.parsedInvoicesMap.set(id, newInvoice);
    return newInvoice;
  }

  async updateParsedInvoiceStatus(id: string, familyId: string, status: string, eventId?: string): Promise<ParsedInvoice> {
    const invoice = this.parsedInvoicesMap.get(id);
    if (!invoice || invoice.familyId !== familyId) {
      throw new NotFoundError(`Parsed invoice with id ${id} not found`);
    }
    invoice.status = status;
    if (eventId) {
      invoice.eventId = eventId;
    }
    this.parsedInvoicesMap.set(id, invoice);
    return invoice;
  }

  async deleteParsedInvoice(id: string, familyId: string): Promise<void> {
    const invoice = this.parsedInvoicesMap.get(id);
    if (!invoice || invoice.familyId !== familyId) {
      throw new NotFoundError(`Parsed invoice with id ${id} not found`);
    }
    this.parsedInvoicesMap.delete(id);
  }

  private advisorUsageMap: Map<string, AdvisorUsage> = new Map();

  async trackAdvisorMessage(userId: string): Promise<void> {
    const now = new Date();
    const existing = this.advisorUsageMap.get(userId);
    if (existing) {
      existing.totalMessages++;
      existing.lastMessageAt = now;
    } else {
      this.advisorUsageMap.set(userId, { userId, totalMessages: 1, totalGreetings: 0, totalConversations: 0, firstSeenAt: now, lastMessageAt: now });
    }
  }

  async trackAdvisorGreeting(userId: string): Promise<void> {
    const now = new Date();
    const existing = this.advisorUsageMap.get(userId);
    if (existing) {
      existing.totalGreetings++;
    } else {
      this.advisorUsageMap.set(userId, { userId, totalMessages: 0, totalGreetings: 1, totalConversations: 0, firstSeenAt: now, lastMessageAt: null });
    }
  }

  async trackAdvisorConversation(userId: string): Promise<void> {
    const now = new Date();
    const existing = this.advisorUsageMap.get(userId);
    if (existing) {
      existing.totalConversations++;
    } else {
      this.advisorUsageMap.set(userId, { userId, totalMessages: 0, totalGreetings: 0, totalConversations: 1, firstSeenAt: now, lastMessageAt: null });
    }
  }

  async getAdvisorUsage(userId: string): Promise<AdvisorUsage | undefined> {
    return this.advisorUsageMap.get(userId);
  }

  async getAllAdvisorUsage(): Promise<AdvisorUsage[]> {
    return Array.from(this.advisorUsageMap.values()).sort((a, b) =>
      (b.lastMessageAt?.getTime() ?? 0) - (a.lastMessageAt?.getTime() ?? 0)
    );
  }

  async submitBetaFeedback(data: { userId?: string; name: string; email: string; comments: string }): Promise<BetaFeedback> {
    const entry: BetaFeedback = {
      id: randomUUID(),
      userId: data.userId ?? null,
      name: data.name,
      email: data.email,
      comments: data.comments,
      createdAt: new Date(),
    };
    return entry;
  }

  async getAllBetaFeedback(): Promise<BetaFeedback[]> {
    return [];
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.usersMap.values());
  }

  async getAdminStats(): Promise<{ totalUsers: number; totalFamilies: number; totalEvents: number; totalFeedback: number }> {
    return { totalUsers: this.usersMap.size, totalFamilies: this.familiesMap.size, totalEvents: this.eventsMap.size, totalFeedback: 0 };
  }

  async createSymptomEntry(entry: InsertSymptomEntry, systems: { system: string; severity: number }[]): Promise<SymptomEntryWithSystems> {
    const id = randomUUID();
    const now = new Date();
    const newEntry: SymptomEntry = { ...entry, id, createdAt: now, moodEmoji: entry.moodEmoji ?? null, triggers: entry.triggers ?? null, notes: entry.notes ?? null, energyLevel: entry.energyLevel ?? null, overallSeverity: entry.overallSeverity ?? null, reactionFlag: entry.reactionFlag ?? "none" };
    this.symptomEntriesMap.set(id, newEntry);
    const ratings: SymptomSystemRating[] = systems.map(s => {
      const rid = randomUUID();
      const r: SymptomSystemRating = { id: rid, entryId: id, system: s.system, severity: s.severity };
      this.symptomSystemRatingsMap.set(rid, r);
      return r;
    });
    return { ...newEntry, systems: ratings };
  }

  async getSymptomEntries(familyId: string, memberId?: string, startDate?: string, endDate?: string): Promise<SymptomEntryWithSystems[]> {
    let entries = Array.from(this.symptomEntriesMap.values()).filter(e => e.familyId === familyId);
    if (memberId) entries = entries.filter(e => e.memberId === memberId);
    if (startDate) entries = entries.filter(e => e.date >= startDate);
    if (endDate) entries = entries.filter(e => e.date <= endDate);
    entries.sort((a, b) => b.date.localeCompare(a.date));
    return entries.map(e => ({
      ...e,
      systems: Array.from(this.symptomSystemRatingsMap.values()).filter(r => r.entryId === e.id),
    }));
  }

  async getSymptomEntry(id: string): Promise<SymptomEntryWithSystems | undefined> {
    const entry = this.symptomEntriesMap.get(id);
    if (!entry) return undefined;
    return { ...entry, systems: Array.from(this.symptomSystemRatingsMap.values()).filter(r => r.entryId === id) };
  }

  async updateSymptomEntry(id: string, entry: Partial<InsertSymptomEntry>, systems?: { system: string; severity: number }[]): Promise<SymptomEntryWithSystems> {
    const existing = this.symptomEntriesMap.get(id);
    if (!existing) throw new Error("Symptom entry not found");
    const updated = { ...existing, ...entry };
    this.symptomEntriesMap.set(id, updated);
    if (systems) {
      Array.from(this.symptomSystemRatingsMap.values()).filter(r => r.entryId === id).forEach(r => this.symptomSystemRatingsMap.delete(r.id));
      systems.forEach(s => {
        const rid = randomUUID();
        this.symptomSystemRatingsMap.set(rid, { id: rid, entryId: id, system: s.system, severity: s.severity });
      });
    }
    return { ...updated, systems: Array.from(this.symptomSystemRatingsMap.values()).filter(r => r.entryId === id) };
  }

  async deleteSymptomEntry(id: string): Promise<void> {
    this.symptomEntriesMap.delete(id);
    Array.from(this.symptomSystemRatingsMap.values()).filter(r => r.entryId === id).forEach(r => this.symptomSystemRatingsMap.delete(r.id));
  }

  async getHydrationLogs(familyId: string, date: string): Promise<HydrationLog[]> {
    return Array.from(this.hydrationLogsMap.values()).filter(h => h.familyId === familyId && h.date === date);
  }

  async upsertHydrationLog(data: { familyId: string; memberId: string; date: string; glassesCount: number; goalGlasses: number }): Promise<HydrationLog> {
    const existing = Array.from(this.hydrationLogsMap.values()).find(h => h.familyId === data.familyId && h.memberId === data.memberId && h.date === data.date);
    if (existing) {
      const updated: HydrationLog = { ...existing, glassesCount: data.glassesCount, goalGlasses: data.goalGlasses, updatedAt: new Date() };
      this.hydrationLogsMap.set(existing.id, updated);
      return updated;
    }
    const id = randomUUID();
    const newLog: HydrationLog = { id, familyId: data.familyId, memberId: data.memberId, date: data.date, glassesCount: data.glassesCount, goalGlasses: data.goalGlasses, updatedAt: new Date() };
    this.hydrationLogsMap.set(id, newLog);
    return newLog;
  }
}

// DrizzleStorage implementation
class DrizzleStorage implements IStorage {
  private db: any;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required for DrizzleStorage");
    }
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    this.db = drizzle(pool);
  }

  private generateInviteCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  private async ensureUserFamily(userId: string): Promise<string> {
    const membership = await this.db.select().from(familyMemberships).where(eq(familyMemberships.userId, userId)).limit(1);
    if (membership[0]) {
      return membership[0].familyId;
    }
    
    const user = await this.getUser(userId);
    const familyName = user?.firstName ? `${user.firstName}'s Family` : "My Family";
    
    const family = await this.createFamily(userId, { name: familyName, createdBy: userId });
    return family.id;
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // First check if user exists by email (to handle email uniqueness constraint)
    let existingUser;
    if (userData.email) {
      const emailCheck = await this.db.select().from(users).where(eq(users.email, userData.email)).limit(1);
      existingUser = emailCheck[0];
    }
    
    let result;
    if (existingUser && existingUser.id !== userData.id) {
      // User exists with same email but different ID - update profile fields only, NEVER change the primary key
      const { id: _ignored, ...profileUpdate } = userData;
      result = await this.db
        .update(users)
        .set({
          ...profileUpdate,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingUser.id))
        .returning();
    } else {
      // Normal upsert by ID
      result = await this.db
        .insert(users)
        .values(userData)
        .onConflictDoUpdate({
          target: users.id,
          set: {
            ...userData,
            updatedAt: new Date(),
          },
        })
        .returning();
    }
    
    return result[0];
  }

  async updateUserSubscription(userId: string, data: { stripeCustomerId?: string; stripeSubscriptionId?: string | null; subscriptionTier?: string; subscriptionStatus?: string }): Promise<User | undefined> {
    const result = await this.db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }

  async getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.stripeCustomerId, stripeCustomerId)).limit(1);
    return result[0];
  }

  async deleteUser(id: string): Promise<void> {
    await this.db.delete(users).where(eq(users.id, id));
  }

  // Family operations
  async createFamily(userId: string, familyData: InsertFamily): Promise<Family> {
    let inviteCode = this.generateInviteCode();
    let existingFamily = await this.db.select().from(families).where(eq(families.inviteCode, inviteCode)).limit(1);
    
    while (existingFamily[0]) {
      inviteCode = this.generateInviteCode();
      existingFamily = await this.db.select().from(families).where(eq(families.inviteCode, inviteCode)).limit(1);
    }
    
    const familyResult = await this.db.insert(families).values({
      ...familyData,
      inviteCode,
    }).returning();
    
    await this.db.insert(familyMemberships).values({
      userId,
      familyId: familyResult[0].id,
      role: 'owner',
    });
    
    return familyResult[0];
  }

  async updateFamily(familyId: string, updates: Partial<InsertFamily>): Promise<Family> {
    const result = await this.db.update(families).set(updates).where(eq(families.id, familyId)).returning();
    if (!result[0]) {
      throw new NotFoundError(`Family not found: ${familyId}`);
    }
    return result[0];
  }

  async getUserFamily(userId: string): Promise<Family | undefined> {
    const membership = await this.db.select().from(familyMemberships).where(eq(familyMemberships.userId, userId)).limit(1);
    if (!membership[0]) {
      return undefined;
    }
    const familyResult = await this.db.select().from(families).where(eq(families.id, membership[0].familyId));
    return familyResult[0];
  }

  async getFamilyByInviteCode(inviteCode: string): Promise<Family | undefined> {
    const result = await this.db.select().from(families).where(eq(families.inviteCode, inviteCode));
    return result[0];
  }

  async joinFamily(userId: string, inviteCode: string, role: string = 'member'): Promise<FamilyMembership> {
    const family = await this.getFamilyByInviteCode(inviteCode);
    if (!family) {
      throw new NotFoundError(`Family with invite code ${inviteCode} not found`);
    }
    
    // Check if user is already a member of this family
    const existingMembership = await this.db.select().from(familyMemberships).where(
      and(eq(familyMemberships.userId, userId), eq(familyMemberships.familyId, family.id))
    ).limit(1);
    
    if (existingMembership[0]) {
      return existingMembership[0];
    }
    
    // Create new membership (user can belong to multiple families now)
    const result = await this.db.insert(familyMemberships).values({
      userId,
      familyId: family.id,
      role,
    }).returning();
    
    return result[0];
  }
  
  async getUserFamilyMembership(userId: string, familyId: string): Promise<FamilyMembership | undefined> {
    const result = await this.db.select().from(familyMemberships).where(
      and(eq(familyMemberships.userId, userId), eq(familyMemberships.familyId, familyId))
    ).limit(1);
    return result[0];
  }

  async addUserToFamily(userId: string, familyId: string, role: string): Promise<FamilyMembership> {
    const existing = await this.getUserFamilyMembership(userId, familyId);
    if (existing) return existing;
    
    const result = await this.db.insert(familyMemberships).values({
      id: randomUUID(),
      userId,
      familyId,
      role,
    }).returning();
    return result[0];
  }

  async leaveFamily(userId: string, familyId: string): Promise<void> {
    await this.db.delete(familyMemberships).where(
      and(eq(familyMemberships.userId, userId), eq(familyMemberships.familyId, familyId))
    );
  }

  async deleteFamily(familyId: string): Promise<void> {
    // Delete all memberships for this family
    await this.db.delete(familyMemberships).where(eq(familyMemberships.familyId, familyId));
    // Delete the family itself
    await this.db.delete(families).where(eq(families.id, familyId));
  }

  async getFamilyMembershipsWithUsers(familyId: string): Promise<Array<FamilyMembership & { user: User }>> {
    const result = await this.db
      .select({
        membership: familyMemberships,
        user: users
      })
      .from(familyMemberships)
      .innerJoin(users, eq(familyMemberships.userId, users.id))
      .where(eq(familyMemberships.familyId, familyId));
    
    return result.map((row: { membership: FamilyMembership; user: User }) => ({
      ...row.membership,
      user: row.user
    }));
  }

  async getUserFamilies(userId: string): Promise<Family[]> {
    const memberships = await this.db.select().from(familyMemberships)
      .where(eq(familyMemberships.userId, userId));
    const familyIds = memberships.map((m: FamilyMembership) => m.familyId);
    
    if (familyIds.length === 0) {
      return [];
    }
    
    const familiesResult = await this.db.select().from(families)
      .where(inArray(families.id, familyIds));
    return familiesResult;
  }

  async getFamilyById(familyId: string): Promise<Family | undefined> {
    const result = await this.db.select().from(families).where(eq(families.id, familyId));
    return result[0];
  }

  // Family Members
  async getFamilyMembers(familyId: string): Promise<FamilyMember[]> {
    return await this.db.select().from(familyMembers).where(eq(familyMembers.familyId, familyId));
  }

  async getFamilyMember(id: string, familyId: string): Promise<FamilyMember | undefined> {
    const result = await this.db.select().from(familyMembers).where(
      and(eq(familyMembers.id, id), eq(familyMembers.familyId, familyId))
    );
    return result[0];
  }

  async createFamilyMember(familyId: string, insertMember: InsertFamilyMember): Promise<FamilyMember> {
    const result = await this.db.insert(familyMembers).values({
      ...insertMember,
      familyId,
    }).returning();
    return result[0];
  }

  async updateFamilyMember(id: string, familyId: string, updates: Partial<FamilyMember>): Promise<FamilyMember> {
    const result = await this.db.update(familyMembers).set(updates).where(
      and(eq(familyMembers.id, id), eq(familyMembers.familyId, familyId))
    ).returning();
    if (!result[0]) {
      throw new NotFoundError(`Family member with id ${id} not found`);
    }
    return result[0];
  }

  async deleteFamilyMember(id: string, familyId: string): Promise<void> {
    const result = await this.db.delete(familyMembers).where(
      and(eq(familyMembers.id, id), eq(familyMembers.familyId, familyId))
    ).returning();
    if (!result[0]) {
      throw new NotFoundError(`Family member with id ${id} not found`);
    }
  }

  // Events
  async getEvents(familyId: string): Promise<Event[]> {
    return await this.db.select().from(events).where(eq(events.familyId, familyId));
  }

  async getEvent(id: string, familyId: string): Promise<Event | undefined> {
    const result = await this.db.select().from(events).where(
      and(eq(events.id, id), eq(events.familyId, familyId))
    );
    return result[0];
  }

  async createEvent(familyId: string, insertEvent: InsertEvent): Promise<Event> {
    const result = await this.db.insert(events).values({
      ...insertEvent,
      familyId,
    }).returning();
    return result[0];
  }

  async updateEvent(id: string, familyId: string, updateData: Partial<InsertEvent>): Promise<Event> {
    const result = await this.db.update(events).set(updateData).where(
      and(eq(events.id, id), eq(events.familyId, familyId))
    ).returning();
    if (!result[0]) {
      throw new NotFoundError(`Event with id ${id} not found`);
    }
    return result[0];
  }

  async deleteEvent(id: string, familyId: string): Promise<void> {
    const result = await this.db.delete(events).where(
      and(eq(events.id, id), eq(events.familyId, familyId))
    ).returning();
    if (!result[0]) {
      throw new NotFoundError(`Event with id ${id} not found`);
    }
  }

  async toggleEventCompletion(id: string, familyId: string): Promise<Event> {
    const event = await this.getEvent(id, familyId);
    if (!event) {
      throw new NotFoundError(`Event with id ${id} not found`);
    }

    const updatedEvent = {
      completed: !event.completed,
      completedAt: !event.completed ? new Date() : null,
    };

    const result = await this.db.update(events).set(updatedEvent).where(
      and(eq(events.id, id), eq(events.familyId, familyId))
    ).returning();
    return result[0];
  }

  // Messages
  async getMessages(eventId: string, familyId: string): Promise<Message[]> {
    return await this.db.select().from(messages).where(
      and(eq(messages.eventId, eventId), eq(messages.familyId, familyId))
    );
  }

  async createMessage(familyId: string, insertMessage: InsertMessage): Promise<Message> {
    const result = await this.db.insert(messages).values({
      ...insertMessage,
      familyId,
    }).returning();
    return result[0];
  }

  async deleteMessage(id: string, familyId: string): Promise<void> {
    await this.db.delete(messages).where(
      and(eq(messages.id, id), eq(messages.familyId, familyId))
    );
  }

  // Event Notes
  async getEventNotes(eventId: string, familyId: string): Promise<EventNote[]> {
    return await this.db.select().from(eventNotes)
      .where(and(eq(eventNotes.eventId, eventId), eq(eventNotes.familyId, familyId)))
      .orderBy(eventNotes.createdAt);
  }

  async getAllEventNotesForFamily(familyId: string): Promise<EventNote[]> {
    return await this.db.select().from(eventNotes)
      .where(eq(eventNotes.familyId, familyId))
      .orderBy(eventNotes.createdAt);
  }

  async createEventNote(familyId: string, insertNote: InsertEventNote): Promise<EventNote> {
    const result = await this.db.insert(eventNotes).values({
      ...insertNote,
      familyId,
    }).returning();
    return result[0];
  }

  async deleteEventNote(id: string, familyId: string): Promise<void> {
    // First delete all replies to this note
    await this.db.delete(eventNotes).where(
      and(eq(eventNotes.parentNoteId, id), eq(eventNotes.familyId, familyId))
    );
    // Then delete the note itself
    await this.db.delete(eventNotes).where(
      and(eq(eventNotes.id, id), eq(eventNotes.familyId, familyId))
    );
  }

  // Medications
  async getMedications(familyId: string): Promise<Medication[]> {
    return await this.db.select().from(medications)
      .where(and(eq(medications.familyId, familyId), eq(medications.isActive, true)));
  }

  async getMedicationsByMember(memberId: string, familyId: string): Promise<Medication[]> {
    return await this.db.select().from(medications)
      .where(and(
        eq(medications.memberId, memberId),
        eq(medications.familyId, familyId),
        eq(medications.isActive, true)
      ));
  }

  async getMedication(id: string, familyId: string): Promise<Medication | undefined> {
    const result = await this.db.select().from(medications)
      .where(and(eq(medications.id, id), eq(medications.familyId, familyId)));
    return result[0];
  }

  async createMedication(familyId: string, insertMedication: InsertMedication): Promise<Medication> {
    const result = await this.db.insert(medications).values({
      ...insertMedication,
      familyId,
    }).returning();
    return result[0];
  }

  async updateMedication(id: string, familyId: string, updates: Partial<Medication>): Promise<Medication> {
    const result = await this.db.update(medications)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(medications.id, id), eq(medications.familyId, familyId)))
      .returning();
    if (!result[0]) {
      throw new NotFoundError(`Medication with id ${id} not found`);
    }
    return result[0];
  }

  async deleteMedication(id: string, familyId: string): Promise<void> {
    // Soft delete
    await this.db.update(medications)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(medications.id, id), eq(medications.familyId, familyId)));
  }

  // Medication Logs
  async getMedicationLogs(medicationId: string, familyId: string): Promise<MedicationLog[]> {
    return await this.db.select().from(medicationLogs)
      .where(and(
        eq(medicationLogs.medicationId, medicationId),
        eq(medicationLogs.familyId, familyId)
      ))
      .orderBy(desc(medicationLogs.administeredAt));
  }

  async getTodaysMedicationLogs(familyId: string): Promise<MedicationLog[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return await this.db.select().from(medicationLogs)
      .where(eq(medicationLogs.familyId, familyId))
      .orderBy(desc(medicationLogs.administeredAt));
  }

  async createMedicationLog(familyId: string, insertLog: InsertMedicationLog): Promise<MedicationLog> {
    const result = await this.db.insert(medicationLogs).values({
      ...insertLog,
      familyId,
    }).returning();
    return result[0];
  }

  // Family Messages
  async getFamilyMessages(familyId: string): Promise<FamilyMessage[]> {
    return await this.db.select().from(familyMessages)
      .where(eq(familyMessages.familyId, familyId))
      .orderBy(familyMessages.createdAt);
  }

  async createFamilyMessage(familyId: string, insertMessage: InsertFamilyMessage & { createdAt?: Date }): Promise<FamilyMessage> {
    const result = await this.db.insert(familyMessages).values({
      ...insertMessage,
      familyId,
    }).returning();
    return result[0];
  }

  async deleteFamilyMessage(id: string, familyId: string): Promise<void> {
    await this.db.delete(familyMessages).where(
      and(eq(familyMessages.id, id), eq(familyMessages.familyId, familyId))
    );
  }

  // Caregiver Pay Rates
  async getCaregiverPayRate(caregiverUserId: string, familyId: string): Promise<CaregiverPayRate | undefined> {
    const result = await this.db.select().from(caregiverPayRates).where(
      and(
        eq(caregiverPayRates.caregiverUserId, caregiverUserId),
        eq(caregiverPayRates.familyId, familyId)
      )
    ).limit(1);
    return result[0];
  }

  async setCaregiverPayRate(familyId: string, caregiverUserId: string, hourlyRate: string, currency: string = "USD"): Promise<CaregiverPayRate> {
    const existing = await this.getCaregiverPayRate(caregiverUserId, familyId);
    
    if (existing) {
      const result = await this.db.update(caregiverPayRates)
        .set({ hourlyRate, currency, updatedAt: new Date() })
        .where(eq(caregiverPayRates.id, existing.id))
        .returning();
      return result[0];
    }

    const result = await this.db.insert(caregiverPayRates).values({
      familyId,
      caregiverUserId,
      hourlyRate,
      currency,
    }).returning();
    return result[0];
  }

  // Caregiver Time Entries
  async getCaregiverTimeEntries(caregiverUserId: string, familyId: string): Promise<CaregiverTimeEntry[]> {
    return await this.db.select().from(caregiverTimeEntries).where(
      and(
        eq(caregiverTimeEntries.caregiverUserId, caregiverUserId),
        eq(caregiverTimeEntries.familyId, familyId)
      )
    ).orderBy(desc(caregiverTimeEntries.entryDate));
  }

  async createCaregiverTimeEntry(familyId: string, caregiverUserId: string, entry: InsertCaregiverTimeEntry, hourlyRate: string): Promise<CaregiverTimeEntry> {
    const hours = parseFloat(entry.hoursWorked);
    const rate = parseFloat(hourlyRate);
    const calculatedPay = (hours * rate).toFixed(2);

    const result = await this.db.insert(caregiverTimeEntries).values({
      familyId,
      caregiverUserId,
      hoursWorked: entry.hoursWorked,
      entryDate: entry.entryDate,
      notes: entry.notes || null,
      hourlyRateAtTime: hourlyRate,
      calculatedPay,
    }).returning();
    return result[0];
  }

  async deleteCaregiverTimeEntry(id: string, caregiverUserId: string, familyId: string): Promise<void> {
    await this.db.delete(caregiverTimeEntries).where(
      and(
        eq(caregiverTimeEntries.id, id),
        eq(caregiverTimeEntries.caregiverUserId, caregiverUserId),
        eq(caregiverTimeEntries.familyId, familyId)
      )
    );
  }

  // Weekly Summary Schedule
  async getWeeklySummarySchedule(familyId: string): Promise<WeeklySummarySchedule | undefined> {
    const results = await this.db.select().from(weeklySummarySchedules).where(eq(weeklySummarySchedules.familyId, familyId));
    return results[0];
  }

  async upsertWeeklySummarySchedule(familyId: string, schedule: Partial<InsertWeeklySummarySchedule>): Promise<WeeklySummarySchedule> {
    const existing = await this.getWeeklySummarySchedule(familyId);
    if (existing) {
      const result = await this.db.update(weeklySummarySchedules)
        .set({ ...schedule, updatedAt: new Date() })
        .where(eq(weeklySummarySchedules.familyId, familyId))
        .returning();
      return result[0];
    }
    const result = await this.db.insert(weeklySummarySchedules).values({
      familyId,
      isEnabled: schedule.isEnabled ?? false,
      dayOfWeek: schedule.dayOfWeek ?? '0',
      timeOfDay: schedule.timeOfDay ?? '08:00',
      timezone: schedule.timezone ?? 'America/New_York',
    }).returning();
    return result[0];
  }

  async getActiveWeeklySummarySchedules(): Promise<WeeklySummarySchedule[]> {
    // Families with an explicit enabled schedule
    const enabledSchedules = await this.db.select()
      .from(weeklySummarySchedules)
      .where(eq(weeklySummarySchedules.isEnabled, true));

    // Families that have NO schedule row at all — treat as enabled by default
    const allScheduleRows = await this.db
      .select({ familyId: weeklySummarySchedules.familyId })
      .from(weeklySummarySchedules);
    const scheduledFamilyIds = new Set(allScheduleRows.map(s => s.familyId));

    const allFamilies = await this.db.select({ id: families.id }).from(families);
    const now = new Date();
    const defaultSchedules: WeeklySummarySchedule[] = allFamilies
      .filter(f => !scheduledFamilyIds.has(f.id))
      .map(f => ({
        id: "",
        familyId: f.id,
        isEnabled: true,
        dayOfWeek: "0",
        timeOfDay: "08:00",
        timezone: "America/New_York",
        lastSentAt: null,
        createdAt: now,
        updatedAt: now,
      }));

    return [...enabledSchedules, ...defaultSchedules];
  }

  async updateWeeklySummaryLastSent(familyId: string): Promise<void> {
    await this.db.update(weeklySummarySchedules)
      .set({ lastSentAt: new Date() })
      .where(eq(weeklySummarySchedules.familyId, familyId));
  }

  // Weekly Summary Preferences
  async getWeeklySummaryPreference(userId: string, familyId: string): Promise<WeeklySummaryPreference | undefined> {
    const results = await this.db.select().from(weeklySummaryPreferences).where(
      and(
        eq(weeklySummaryPreferences.userId, userId),
        eq(weeklySummaryPreferences.familyId, familyId)
      )
    );
    return results[0];
  }

  async upsertWeeklySummaryPreference(userId: string, familyId: string, optedIn: boolean): Promise<WeeklySummaryPreference> {
    const existing = await this.getWeeklySummaryPreference(userId, familyId);
    if (existing) {
      const result = await this.db.update(weeklySummaryPreferences)
        .set({ optedIn, updatedAt: new Date() })
        .where(and(
          eq(weeklySummaryPreferences.userId, userId),
          eq(weeklySummaryPreferences.familyId, familyId)
        ))
        .returning();
      return result[0];
    }
    const result = await this.db.insert(weeklySummaryPreferences).values({
      userId,
      familyId,
      optedIn,
    }).returning();
    return result[0];
  }

  async getOptedInUsersForFamily(familyId: string): Promise<Array<{ userId: string; user: User }>> {
    const prefs = await this.db.select().from(weeklySummaryPreferences).where(
      and(
        eq(weeklySummaryPreferences.familyId, familyId),
        eq(weeklySummaryPreferences.optedIn, true)
      )
    );
    const result: Array<{ userId: string; user: User }> = [];
    for (const pref of prefs) {
      const userResults = await this.db.select().from(users).where(eq(users.id, pref.userId));
      if (userResults[0]) {
        result.push({ userId: pref.userId, user: userResults[0] });
      }
    }
    return result;
  }

  // Care Documents
  async getCareDocuments(familyId: string): Promise<CareDocument[]> {
    return await this.db.select().from(careDocuments)
      .where(eq(careDocuments.familyId, familyId))
      .orderBy(desc(careDocuments.createdAt));
  }

  async getCareDocumentsByMember(memberId: string, familyId: string): Promise<CareDocument[]> {
    return await this.db.select().from(careDocuments)
      .where(and(
        eq(careDocuments.memberId, memberId),
        eq(careDocuments.familyId, familyId)
      ))
      .orderBy(desc(careDocuments.createdAt));
  }

  async getCareDocument(id: string, familyId: string): Promise<CareDocument | undefined> {
    const result = await this.db.select().from(careDocuments)
      .where(and(eq(careDocuments.id, id), eq(careDocuments.familyId, familyId)));
    return result[0];
  }

  async createCareDocument(familyId: string, insertDoc: InsertCareDocument): Promise<CareDocument> {
    const result = await this.db.insert(careDocuments).values({
      ...insertDoc,
      familyId,
    }).returning();
    return result[0];
  }

  async deleteCareDocument(id: string, familyId: string): Promise<void> {
    const result = await this.db.delete(careDocuments)
      .where(and(eq(careDocuments.id, id), eq(careDocuments.familyId, familyId)))
      .returning();
    if (!result[0]) {
      throw new NotFoundError(`Care document with id ${id} not found`);
    }
  }

  // Emergency Bridge Token methods
  async getEmergencyBridgeTokens(familyId: string): Promise<EmergencyBridgeToken[]> {
    return await this.db.select().from(emergencyBridgeTokens)
      .where(and(
        eq(emergencyBridgeTokens.familyId, familyId),
        eq(emergencyBridgeTokens.status, 'active')
      ))
      .orderBy(desc(emergencyBridgeTokens.createdAt));
  }

  async getEmergencyBridgeTokenByHash(tokenHash: string): Promise<EmergencyBridgeToken | undefined> {
    const result = await this.db.select().from(emergencyBridgeTokens)
      .where(eq(emergencyBridgeTokens.tokenHash, tokenHash));
    return result[0];
  }

  async createEmergencyBridgeToken(
    familyId: string,
    createdByUserId: string,
    tokenHash: string,
    expiresAt: Date,
    label?: string | null
  ): Promise<EmergencyBridgeToken> {
    const result = await this.db.insert(emergencyBridgeTokens).values({
      familyId,
      createdByUserId,
      tokenHash,
      expiresAt,
      label: label ?? null,
      status: 'active',
      accessCount: 0,
    }).returning();
    return result[0];
  }

  async revokeEmergencyBridgeToken(id: string, familyId: string): Promise<void> {
    const result = await this.db.update(emergencyBridgeTokens)
      .set({ status: 'revoked' })
      .where(and(
        eq(emergencyBridgeTokens.id, id),
        eq(emergencyBridgeTokens.familyId, familyId)
      ))
      .returning();
    if (!result[0]) {
      throw new NotFoundError(`Emergency bridge token with id ${id} not found`);
    }
  }

  async incrementEmergencyBridgeTokenAccess(id: string): Promise<void> {
    const token = await this.db.select().from(emergencyBridgeTokens)
      .where(eq(emergencyBridgeTokens.id, id));
    if (token[0]) {
      await this.db.update(emergencyBridgeTokens)
        .set({
          accessCount: (token[0].accessCount || 0) + 1,
          lastAccessedAt: new Date(),
        })
        .where(eq(emergencyBridgeTokens.id, id));
    }
  }

  // Parsed Invoices
  async getParsedInvoices(familyId: string): Promise<ParsedInvoice[]> {
    return this.db.select().from(parsedInvoices)
      .where(eq(parsedInvoices.familyId, familyId))
      .orderBy(desc(parsedInvoices.createdAt));
  }

  async getParsedInvoiceByMessageId(gmailMessageId: string, familyId: string): Promise<ParsedInvoice | undefined> {
    const result = await this.db.select().from(parsedInvoices)
      .where(and(
        eq(parsedInvoices.gmailMessageId, gmailMessageId),
        eq(parsedInvoices.familyId, familyId)
      ));
    return result[0];
  }

  async createParsedInvoice(familyId: string, userId: string, invoice: Omit<InsertParsedInvoice, 'familyId' | 'createdByUserId'>): Promise<ParsedInvoice> {
    const result = await this.db.insert(parsedInvoices).values({
      familyId,
      createdByUserId: userId,
      gmailMessageId: invoice.gmailMessageId,
      subject: invoice.subject,
      sender: invoice.sender,
      senderEmail: invoice.senderEmail,
      amount: invoice.amount ? String(invoice.amount) : null,
      dueDate: invoice.dueDate,
      category: invoice.category || 'other',
      status: 'pending',
      snippet: invoice.snippet,
      receivedAt: invoice.receivedAt,
    }).returning();
    return result[0];
  }

  async updateParsedInvoiceStatus(id: string, familyId: string, status: string, eventId?: string): Promise<ParsedInvoice> {
    const updates: any = { status };
    if (eventId) {
      updates.eventId = eventId;
    }
    const result = await this.db.update(parsedInvoices)
      .set(updates)
      .where(and(
        eq(parsedInvoices.id, id),
        eq(parsedInvoices.familyId, familyId)
      ))
      .returning();
    if (!result[0]) {
      throw new NotFoundError(`Parsed invoice with id ${id} not found`);
    }
    return result[0];
  }

  async deleteParsedInvoice(id: string, familyId: string): Promise<void> {
    const result = await this.db.delete(parsedInvoices)
      .where(and(
        eq(parsedInvoices.id, id),
        eq(parsedInvoices.familyId, familyId)
      ))
      .returning();
    if (!result[0]) {
      throw new NotFoundError(`Parsed invoice with id ${id} not found`);
    }
  }

  async trackAdvisorMessage(userId: string): Promise<void> {
    await this.db.insert(advisorUsage)
      .values({ userId, totalMessages: 1, totalGreetings: 0, totalConversations: 0, lastMessageAt: new Date() })
      .onConflictDoUpdate({
        target: advisorUsage.userId,
        set: {
          totalMessages: sql`${advisorUsage.totalMessages} + 1`,
          lastMessageAt: new Date(),
        },
      });
  }

  async trackAdvisorGreeting(userId: string): Promise<void> {
    await this.db.insert(advisorUsage)
      .values({ userId, totalMessages: 0, totalGreetings: 1, totalConversations: 0 })
      .onConflictDoUpdate({
        target: advisorUsage.userId,
        set: {
          totalGreetings: sql`${advisorUsage.totalGreetings} + 1`,
        },
      });
  }

  async trackAdvisorConversation(userId: string): Promise<void> {
    await this.db.insert(advisorUsage)
      .values({ userId, totalMessages: 0, totalGreetings: 0, totalConversations: 1 })
      .onConflictDoUpdate({
        target: advisorUsage.userId,
        set: {
          totalConversations: sql`${advisorUsage.totalConversations} + 1`,
        },
      });
  }

  async getAdvisorUsage(userId: string): Promise<AdvisorUsage | undefined> {
    const result = await this.db.select().from(advisorUsage).where(eq(advisorUsage.userId, userId));
    return result[0];
  }

  async getAllAdvisorUsage(): Promise<AdvisorUsage[]> {
    return this.db.select().from(advisorUsage).orderBy(desc(advisorUsage.lastMessageAt));
  }

  async submitBetaFeedback(data: { userId?: string; name: string; email: string; comments: string }): Promise<BetaFeedback> {
    const result = await this.db.insert(betaFeedback).values({
      userId: data.userId ?? null,
      name: data.name,
      email: data.email,
      comments: data.comments,
    }).returning();
    return result[0];
  }

  async getAllBetaFeedback(): Promise<BetaFeedback[]> {
    return this.db.select().from(betaFeedback).orderBy(desc(betaFeedback.createdAt));
  }

  async getAllUsers(): Promise<User[]> {
    return this.db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getAdminStats(): Promise<{ totalUsers: number; totalFamilies: number; totalEvents: number; totalFeedback: number }> {
    const [usersCount] = await this.db.select({ count: sql<number>`count(*)::int` }).from(users);
    const [familiesCount] = await this.db.select({ count: sql<number>`count(*)::int` }).from(families);
    const [eventsCount] = await this.db.select({ count: sql<number>`count(*)::int` }).from(events);
    const [feedbackCount] = await this.db.select({ count: sql<number>`count(*)::int` }).from(betaFeedback);
    return {
      totalUsers: usersCount?.count ?? 0,
      totalFamilies: familiesCount?.count ?? 0,
      totalEvents: eventsCount?.count ?? 0,
      totalFeedback: feedbackCount?.count ?? 0,
    };
  }

  async createSymptomEntry(entry: InsertSymptomEntry, systems: { system: string; severity: number }[]): Promise<SymptomEntryWithSystems> {
    const [created] = await this.db.insert(symptomEntries).values(entry).returning();
    let ratings: SymptomSystemRating[] = [];
    if (systems.length > 0) {
      ratings = await this.db.insert(symptomSystemRatings).values(systems.map(s => ({ entryId: created.id, system: s.system, severity: s.severity }))).returning();
    }
    return { ...created, systems: ratings };
  }

  async getSymptomEntries(familyId: string, memberId?: string, startDate?: string, endDate?: string): Promise<SymptomEntryWithSystems[]> {
    const conditions = [eq(symptomEntries.familyId, familyId)];
    if (memberId) conditions.push(eq(symptomEntries.memberId, memberId));
    if (startDate) conditions.push(sql`${symptomEntries.date} >= ${startDate}`);
    if (endDate) conditions.push(sql`${symptomEntries.date} <= ${endDate}`);
    const rows = await this.db.select().from(symptomEntries).where(and(...conditions)).orderBy(desc(symptomEntries.date));
    if (rows.length === 0) return [];
    const entryIds = rows.map((r: SymptomEntry) => r.id);
    const allRatings: SymptomSystemRating[] = await this.db.select().from(symptomSystemRatings).where(inArray(symptomSystemRatings.entryId, entryIds));
    return rows.map((row: SymptomEntry) => ({ ...row, systems: allRatings.filter(r => r.entryId === row.id) }));
  }

  async getSymptomEntry(id: string): Promise<SymptomEntryWithSystems | undefined> {
    const [entry] = await this.db.select().from(symptomEntries).where(eq(symptomEntries.id, id));
    if (!entry) return undefined;
    const ratings = await this.db.select().from(symptomSystemRatings).where(eq(symptomSystemRatings.entryId, id));
    return { ...entry, systems: ratings };
  }

  async updateSymptomEntry(id: string, entry: Partial<InsertSymptomEntry>, systems?: { system: string; severity: number }[]): Promise<SymptomEntryWithSystems> {
    const [updated] = await this.db.update(symptomEntries).set(entry).where(eq(symptomEntries.id, id)).returning();
    let ratings: SymptomSystemRating[] = [];
    if (systems) {
      await this.db.delete(symptomSystemRatings).where(eq(symptomSystemRatings.entryId, id));
      if (systems.length > 0) {
        ratings = await this.db.insert(symptomSystemRatings).values(systems.map(s => ({ entryId: id, system: s.system, severity: s.severity }))).returning();
      }
    } else {
      ratings = await this.db.select().from(symptomSystemRatings).where(eq(symptomSystemRatings.entryId, id));
    }
    return { ...updated, systems: ratings };
  }

  async deleteSymptomEntry(id: string): Promise<void> {
    await this.db.delete(symptomSystemRatings).where(eq(symptomSystemRatings.entryId, id));
    await this.db.delete(symptomEntries).where(eq(symptomEntries.id, id));
  }

  async getHydrationLogs(familyId: string, date: string): Promise<HydrationLog[]> {
    return await this.db.select().from(hydrationLogs).where(and(eq(hydrationLogs.familyId, familyId), eq(hydrationLogs.date, date)));
  }

  async upsertHydrationLog(data: { familyId: string; memberId: string; date: string; glassesCount: number; goalGlasses: number }): Promise<HydrationLog> {
    const existing = await this.db.select().from(hydrationLogs).where(and(eq(hydrationLogs.familyId, data.familyId), eq(hydrationLogs.memberId, data.memberId), eq(hydrationLogs.date, data.date)));
    if (existing.length > 0) {
      const [updated] = await this.db.update(hydrationLogs).set({ glassesCount: data.glassesCount, goalGlasses: data.goalGlasses, updatedAt: new Date() }).where(eq(hydrationLogs.id, existing[0].id)).returning();
      return updated;
    }
    const [created] = await this.db.insert(hydrationLogs).values({ familyId: data.familyId, memberId: data.memberId, date: data.date, glassesCount: data.glassesCount, goalGlasses: data.goalGlasses }).returning();
    return created;
  }
}

// Demo-aware storage wrapper that uses in-memory storage for demo users
class DemoAwareStorage implements IStorage {
  private persistentStorage: IStorage;
  private demoStorage: MemStorage;

  constructor(persistentStorage: IStorage) {
    this.persistentStorage = persistentStorage;
    this.demoStorage = new MemStorage();
  }

  private isDemoUser(userId: string): boolean {
    return userId.startsWith("demo-");
  }

  private getStorage(userId: string): IStorage {
    return this.isDemoUser(userId) ? this.demoStorage : this.persistentStorage;
  }

  private async getStorageForFamily(familyId: string): Promise<IStorage> {
    // Check demo storage first
    const demoFamily = await this.demoStorage.getFamilyById(familyId);
    if (demoFamily) {
      return this.demoStorage;
    }
    // Default to persistent storage
    return this.persistentStorage;
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.getStorage(id).getUser(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const demoUser = await this.demoStorage.getUserByEmail(email);
    if (demoUser) return demoUser;
    return this.persistentStorage.getUserByEmail(email);
  }

  async upsertUser(user: UpsertUser): Promise<User> {
    return this.getStorage(user.id).upsertUser(user);
  }

  async updateUserSubscription(userId: string, data: { stripeCustomerId?: string; stripeSubscriptionId?: string | null; subscriptionTier?: string; subscriptionStatus?: string }): Promise<User | undefined> {
    return this.getStorage(userId).updateUserSubscription(userId, data);
  }

  async getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined> {
    const demoUser = await this.demoStorage.getUserByStripeCustomerId(stripeCustomerId);
    if (demoUser) return demoUser;
    return this.persistentStorage.getUserByStripeCustomerId(stripeCustomerId);
  }

  async deleteUser(id: string): Promise<void> {
    return this.getStorage(id).deleteUser(id);
  }

  // Family operations
  async createFamily(userId: string, family: InsertFamily): Promise<Family> {
    return this.getStorage(userId).createFamily(userId, family);
  }

  async updateFamily(familyId: string, updates: Partial<InsertFamily>): Promise<Family> {
    // For demo users, use demo storage; otherwise use persistent
    // Since we don't have userId here, we check if familyId belongs to demo storage
    const demoFamily = await this.demoStorage.getFamilyById(familyId);
    if (demoFamily) {
      return this.demoStorage.updateFamily(familyId, updates);
    }
    return this.persistentStorage.updateFamily(familyId, updates);
  }

  async getUserFamily(userId: string): Promise<Family | undefined> {
    return this.getStorage(userId).getUserFamily(userId);
  }

  async getUserFamilies(userId: string): Promise<Family[]> {
    return this.getStorage(userId).getUserFamilies(userId);
  }

  async getFamilyById(familyId: string): Promise<Family | undefined> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.getFamilyById(familyId);
  }

  async getFamilyByInviteCode(inviteCode: string): Promise<Family | undefined> {
    // Check demo storage first
    const demoFamily = await this.demoStorage.getFamilyByInviteCode(inviteCode);
    if (demoFamily) {
      return demoFamily;
    }
    return this.persistentStorage.getFamilyByInviteCode(inviteCode);
  }

  async joinFamily(userId: string, inviteCode: string, role?: string): Promise<FamilyMembership> {
    return this.getStorage(userId).joinFamily(userId, inviteCode, role);
  }
  
  async getUserFamilyMembership(userId: string, familyId: string): Promise<FamilyMembership | undefined> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.getUserFamilyMembership(userId, familyId);
  }

  async addUserToFamily(userId: string, familyId: string, role: string): Promise<FamilyMembership> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.addUserToFamily(userId, familyId, role);
  }

  async leaveFamily(userId: string, familyId: string): Promise<void> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.leaveFamily(userId, familyId);
  }

  async deleteFamily(familyId: string): Promise<void> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.deleteFamily(familyId);
  }

  async getFamilyMembershipsWithUsers(familyId: string): Promise<Array<FamilyMembership & { user: User }>> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.getFamilyMembershipsWithUsers(familyId);
  }

  // Family Members
  async getFamilyMembers(familyId: string): Promise<FamilyMember[]> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.getFamilyMembers(familyId);
  }

  async getFamilyMember(id: string, familyId: string): Promise<FamilyMember | undefined> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.getFamilyMember(id, familyId);
  }

  async createFamilyMember(familyId: string, member: InsertFamilyMember): Promise<FamilyMember> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.createFamilyMember(familyId, member);
  }

  async updateFamilyMember(id: string, familyId: string, updates: Partial<FamilyMember>): Promise<FamilyMember> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.updateFamilyMember(id, familyId, updates);
  }

  async deleteFamilyMember(id: string, familyId: string): Promise<void> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.deleteFamilyMember(id, familyId);
  }

  // Events
  async getEvents(familyId: string): Promise<Event[]> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.getEvents(familyId);
  }

  async getEvent(id: string, familyId: string): Promise<Event | undefined> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.getEvent(id, familyId);
  }

  async createEvent(familyId: string, event: InsertEvent): Promise<Event> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.createEvent(familyId, event);
  }

  async updateEvent(id: string, familyId: string, event: Partial<InsertEvent>): Promise<Event> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.updateEvent(id, familyId, event);
  }

  async deleteEvent(id: string, familyId: string): Promise<void> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.deleteEvent(id, familyId);
  }

  async toggleEventCompletion(id: string, familyId: string): Promise<Event> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.toggleEventCompletion(id, familyId);
  }

  // Messages
  async getMessages(eventId: string, familyId: string): Promise<Message[]> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.getMessages(eventId, familyId);
  }

  async createMessage(familyId: string, message: InsertMessage): Promise<Message> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.createMessage(familyId, message);
  }

  async deleteMessage(id: string, familyId: string): Promise<void> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.deleteMessage(id, familyId);
  }

  // Event Notes
  async getEventNotes(eventId: string, familyId: string): Promise<EventNote[]> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.getEventNotes(eventId, familyId);
  }

  async getAllEventNotesForFamily(familyId: string): Promise<EventNote[]> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.getAllEventNotesForFamily(familyId);
  }

  async createEventNote(familyId: string, note: InsertEventNote): Promise<EventNote> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.createEventNote(familyId, note);
  }

  async deleteEventNote(id: string, familyId: string): Promise<void> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.deleteEventNote(id, familyId);
  }

  // Medications
  async getMedications(familyId: string): Promise<Medication[]> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.getMedications(familyId);
  }

  async getMedicationsByMember(memberId: string, familyId: string): Promise<Medication[]> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.getMedicationsByMember(memberId, familyId);
  }

  async getMedication(id: string, familyId: string): Promise<Medication | undefined> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.getMedication(id, familyId);
  }

  async createMedication(familyId: string, medication: InsertMedication): Promise<Medication> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.createMedication(familyId, medication);
  }

  async updateMedication(id: string, familyId: string, updates: Partial<Medication>): Promise<Medication> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.updateMedication(id, familyId, updates);
  }

  async deleteMedication(id: string, familyId: string): Promise<void> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.deleteMedication(id, familyId);
  }

  // Medication Logs
  async getMedicationLogs(medicationId: string, familyId: string): Promise<MedicationLog[]> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.getMedicationLogs(medicationId, familyId);
  }

  async getTodaysMedicationLogs(familyId: string): Promise<MedicationLog[]> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.getTodaysMedicationLogs(familyId);
  }

  async createMedicationLog(familyId: string, log: InsertMedicationLog): Promise<MedicationLog> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.createMedicationLog(familyId, log);
  }

  // Family Messages
  async getFamilyMessages(familyId: string): Promise<FamilyMessage[]> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.getFamilyMessages(familyId);
  }

  async createFamilyMessage(familyId: string, message: InsertFamilyMessage & { createdAt?: Date }): Promise<FamilyMessage> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.createFamilyMessage(familyId, message);
  }

  async deleteFamilyMessage(id: string, familyId: string): Promise<void> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.deleteFamilyMessage(id, familyId);
  }

  // Caregiver Pay Rates
  async getCaregiverPayRate(caregiverUserId: string, familyId: string): Promise<CaregiverPayRate | undefined> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.getCaregiverPayRate(caregiverUserId, familyId);
  }

  async setCaregiverPayRate(familyId: string, caregiverUserId: string, hourlyRate: string, currency?: string): Promise<CaregiverPayRate> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.setCaregiverPayRate(familyId, caregiverUserId, hourlyRate, currency);
  }

  // Caregiver Time Entries
  async getCaregiverTimeEntries(caregiverUserId: string, familyId: string): Promise<CaregiverTimeEntry[]> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.getCaregiverTimeEntries(caregiverUserId, familyId);
  }

  async createCaregiverTimeEntry(familyId: string, caregiverUserId: string, entry: InsertCaregiverTimeEntry, hourlyRate: string): Promise<CaregiverTimeEntry> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.createCaregiverTimeEntry(familyId, caregiverUserId, entry, hourlyRate);
  }

  async deleteCaregiverTimeEntry(id: string, caregiverUserId: string, familyId: string): Promise<void> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.deleteCaregiverTimeEntry(id, caregiverUserId, familyId);
  }

  // Weekly Summary Schedule
  async getWeeklySummarySchedule(familyId: string): Promise<WeeklySummarySchedule | undefined> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.getWeeklySummarySchedule(familyId);
  }

  async upsertWeeklySummarySchedule(familyId: string, schedule: Partial<InsertWeeklySummarySchedule>): Promise<WeeklySummarySchedule> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.upsertWeeklySummarySchedule(familyId, schedule);
  }

  async getActiveWeeklySummarySchedules(): Promise<WeeklySummarySchedule[]> {
    // For automated schedules, we only check persistent storage (real users)
    return this.persistentStorage.getActiveWeeklySummarySchedules();
  }

  async updateWeeklySummaryLastSent(familyId: string): Promise<void> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.updateWeeklySummaryLastSent(familyId);
  }

  // Weekly Summary Preferences
  async getWeeklySummaryPreference(userId: string, familyId: string): Promise<WeeklySummaryPreference | undefined> {
    const storage = this.getStorage(userId);
    return storage.getWeeklySummaryPreference(userId, familyId);
  }

  async upsertWeeklySummaryPreference(userId: string, familyId: string, optedIn: boolean): Promise<WeeklySummaryPreference> {
    const storage = this.getStorage(userId);
    return storage.upsertWeeklySummaryPreference(userId, familyId, optedIn);
  }

  async getOptedInUsersForFamily(familyId: string): Promise<Array<{ userId: string; user: User }>> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.getOptedInUsersForFamily(familyId);
  }

  // Care Documents
  async getCareDocuments(familyId: string): Promise<CareDocument[]> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.getCareDocuments(familyId);
  }

  async getCareDocumentsByMember(memberId: string, familyId: string): Promise<CareDocument[]> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.getCareDocumentsByMember(memberId, familyId);
  }

  async getCareDocument(id: string, familyId: string): Promise<CareDocument | undefined> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.getCareDocument(id, familyId);
  }

  async createCareDocument(familyId: string, document: InsertCareDocument): Promise<CareDocument> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.createCareDocument(familyId, document);
  }

  async deleteCareDocument(id: string, familyId: string): Promise<void> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.deleteCareDocument(id, familyId);
  }

  // Emergency Bridge Tokens
  async getEmergencyBridgeTokens(familyId: string): Promise<EmergencyBridgeToken[]> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.getEmergencyBridgeTokens(familyId);
  }

  async getEmergencyBridgeTokenByHash(tokenHash: string): Promise<EmergencyBridgeToken | undefined> {
    // Try demo storage first, then persistent
    const demoToken = await this.demoStorage.getEmergencyBridgeTokenByHash(tokenHash);
    if (demoToken) return demoToken;
    return this.persistentStorage.getEmergencyBridgeTokenByHash(tokenHash);
  }

  async createEmergencyBridgeToken(
    familyId: string,
    createdByUserId: string,
    tokenHash: string,
    expiresAt: Date,
    label?: string | null
  ): Promise<EmergencyBridgeToken> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.createEmergencyBridgeToken(familyId, createdByUserId, tokenHash, expiresAt, label);
  }

  async revokeEmergencyBridgeToken(id: string, familyId: string): Promise<void> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.revokeEmergencyBridgeToken(id, familyId);
  }

  async incrementEmergencyBridgeTokenAccess(id: string): Promise<void> {
    // Try demo storage first, then persistent
    const demoTokens = Array.from((this.demoStorage as any).emergencyBridgeTokensMap?.values() || []);
    const demoToken = demoTokens.find((t: any) => t.id === id);
    if (demoToken) {
      return this.demoStorage.incrementEmergencyBridgeTokenAccess(id);
    }
    return this.persistentStorage.incrementEmergencyBridgeTokenAccess(id);
  }

  // Parsed Invoices
  async getParsedInvoices(familyId: string): Promise<ParsedInvoice[]> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.getParsedInvoices(familyId);
  }

  async getParsedInvoiceByMessageId(gmailMessageId: string, familyId: string): Promise<ParsedInvoice | undefined> {
    // Try demo storage first, then persistent
    const demoInvoice = await this.demoStorage.getParsedInvoiceByMessageId(gmailMessageId, familyId);
    if (demoInvoice) return demoInvoice;
    return this.persistentStorage.getParsedInvoiceByMessageId(gmailMessageId, familyId);
  }

  async createParsedInvoice(familyId: string, userId: string, invoice: Omit<InsertParsedInvoice, 'familyId' | 'createdByUserId'>): Promise<ParsedInvoice> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.createParsedInvoice(familyId, userId, invoice);
  }

  async updateParsedInvoiceStatus(id: string, familyId: string, status: string, eventId?: string): Promise<ParsedInvoice> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.updateParsedInvoiceStatus(id, familyId, status, eventId);
  }

  async deleteParsedInvoice(id: string, familyId: string): Promise<void> {
    const storage = await this.getStorageForFamily(familyId);
    return storage.deleteParsedInvoice(id, familyId);
  }

  async trackAdvisorMessage(userId: string): Promise<void> {
    if (userId.startsWith('demo-')) return;
    return this.persistentStorage.trackAdvisorMessage(userId);
  }

  async trackAdvisorGreeting(userId: string): Promise<void> {
    if (userId.startsWith('demo-')) return;
    return this.persistentStorage.trackAdvisorGreeting(userId);
  }

  async trackAdvisorConversation(userId: string): Promise<void> {
    if (userId.startsWith('demo-')) return;
    return this.persistentStorage.trackAdvisorConversation(userId);
  }

  async getAdvisorUsage(userId: string): Promise<AdvisorUsage | undefined> {
    if (userId.startsWith('demo-')) return undefined;
    return this.persistentStorage.getAdvisorUsage(userId);
  }

  async getAllAdvisorUsage(): Promise<AdvisorUsage[]> {
    return this.persistentStorage.getAllAdvisorUsage();
  }

  async submitBetaFeedback(data: { userId?: string; name: string; email: string; comments: string }): Promise<BetaFeedback> {
    return this.persistentStorage.submitBetaFeedback(data);
  }

  async getAllBetaFeedback(): Promise<BetaFeedback[]> {
    return this.persistentStorage.getAllBetaFeedback();
  }

  async getAllUsers(): Promise<User[]> {
    return this.persistentStorage.getAllUsers();
  }

  async getAdminStats(): Promise<{ totalUsers: number; totalFamilies: number; totalEvents: number; totalFeedback: number }> {
    return this.persistentStorage.getAdminStats();
  }

  async createSymptomEntry(entry: InsertSymptomEntry, systems: { system: string; severity: number }[]): Promise<SymptomEntryWithSystems> {
    return this.persistentStorage.createSymptomEntry(entry, systems);
  }

  async getSymptomEntries(familyId: string, memberId?: string, startDate?: string, endDate?: string): Promise<SymptomEntryWithSystems[]> {
    return this.persistentStorage.getSymptomEntries(familyId, memberId, startDate, endDate);
  }

  async getSymptomEntry(id: string): Promise<SymptomEntryWithSystems | undefined> {
    return this.persistentStorage.getSymptomEntry(id);
  }

  async updateSymptomEntry(id: string, entry: Partial<InsertSymptomEntry>, systems?: { system: string; severity: number }[]): Promise<SymptomEntryWithSystems> {
    return this.persistentStorage.updateSymptomEntry(id, entry, systems);
  }

  async deleteSymptomEntry(id: string): Promise<void> {
    return this.persistentStorage.deleteSymptomEntry(id);
  }

  async getHydrationLogs(familyId: string, date: string): Promise<HydrationLog[]> {
    return this.persistentStorage.getHydrationLogs(familyId, date);
  }

  async upsertHydrationLog(data: { familyId: string; memberId: string; date: string; glassesCount: number; goalGlasses: number }): Promise<HydrationLog> {
    return this.persistentStorage.upsertHydrationLog(data);
  }
}

// Initialize storage
let storage: IStorage;

try {
  if (process.env.DATABASE_URL) {
    const persistentStorage = new DrizzleStorage();
    storage = new DemoAwareStorage(persistentStorage);
  } else {
    storage = new MemStorage();
  }
} catch (error) {
  console.error("Failed to initialize database storage, falling back to in-memory:", error);
  storage = new MemStorage();
}

export { storage };
