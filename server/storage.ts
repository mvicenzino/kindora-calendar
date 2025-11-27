import { type FamilyMember, type InsertFamilyMember, type Event, type InsertEvent, type Message, type InsertMessage, type User, type UpsertUser, type Family, type InsertFamily, type FamilyMembership, type EventNote, type InsertEventNote, type Medication, type InsertMedication, type MedicationLog, type InsertMedicationLog, type FamilyMessage, type InsertFamilyMessage, type CaregiverPayRate, type InsertCaregiverPayRate, type CaregiverTimeEntry, type InsertCaregiverTimeEntry, familyMembers, events, messages, users, families, familyMemberships, eventNotes, medications, medicationLogs, familyMessages, caregiverPayRates, caregiverTimeEntries } from "@shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and, inArray, isNull, desc } from "drizzle-orm";

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export interface IStorage {
  // User operations (MANDATORY for auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Family operations
  createFamily(userId: string, family: InsertFamily): Promise<Family>;
  getUserFamily(userId: string): Promise<Family | undefined>;
  getUserFamilies(userId: string): Promise<Family[]>;
  getFamilyById(familyId: string): Promise<Family | undefined>;
  getFamilyByInviteCode(inviteCode: string): Promise<Family | undefined>;
  joinFamily(userId: string, inviteCode: string, role?: string): Promise<FamilyMembership>;
  getUserFamilyMembership(userId: string, familyId: string): Promise<FamilyMembership | undefined>;
  addUserToFamily(userId: string, familyId: string, role: string): Promise<FamilyMembership>;
  getFamilyMembershipsWithUsers(familyId: string): Promise<Array<FamilyMembership & { user: User }>>;
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

  async upsertUser(user: UpsertUser): Promise<User> {
    const id = user.id;
    const existingUser = this.users.get(id);
    const userData: User = {
      id,
      email: user.email ?? existingUser?.email ?? null,
      firstName: user.firstName ?? existingUser?.firstName ?? null,
      lastName: user.lastName ?? existingUser?.lastName ?? null,
      profileImageUrl: user.profileImageUrl ?? existingUser?.profileImageUrl ?? null,
      createdAt: existingUser?.createdAt || new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, userData);
    
    await this.ensureUserFamily(id);
    
    return userData;
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
}

// DrizzleStorage implementation
class DrizzleStorage implements IStorage {
  private db: any;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required for DrizzleStorage");
    }
    this.db = drizzle(process.env.DATABASE_URL);
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

  async upsertUser(userData: UpsertUser): Promise<User> {
    // First check if user exists by email (to handle email uniqueness constraint)
    let existingUser;
    if (userData.email) {
      const emailCheck = await this.db.select().from(users).where(eq(users.email, userData.email)).limit(1);
      existingUser = emailCheck[0];
    }
    
    let result;
    if (existingUser && existingUser.id !== userData.id) {
      // User exists with same email but different ID - update the existing user
      result = await this.db
        .update(users)
        .set({
          ...userData,
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
    
    await this.ensureUserFamily(result[0].id);
    
    return result[0];
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

  async upsertUser(user: UpsertUser): Promise<User> {
    return this.getStorage(user.id).upsertUser(user);
  }

  // Family operations
  async createFamily(userId: string, family: InsertFamily): Promise<Family> {
    return this.getStorage(userId).createFamily(userId, family);
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
