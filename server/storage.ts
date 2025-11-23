import { type FamilyMember, type InsertFamilyMember, type Event, type InsertEvent, type Message, type InsertMessage, type User, type UpsertUser, familyMembers, events, messages, users } from "@shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and } from "drizzle-orm";

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

  // Family Members
  getFamilyMembers(userId: string): Promise<FamilyMember[]>;
  getFamilyMember(id: string, userId: string): Promise<FamilyMember | undefined>;
  createFamilyMember(userId: string, member: InsertFamilyMember): Promise<FamilyMember>;
  updateFamilyMember(id: string, userId: string, updates: Partial<FamilyMember>): Promise<FamilyMember>;
  deleteFamilyMember(id: string, userId: string): Promise<void>;

  // Events
  getEvents(userId: string): Promise<Event[]>;
  getEvent(id: string, userId: string): Promise<Event | undefined>;
  createEvent(userId: string, event: InsertEvent): Promise<Event>;
  updateEvent(id: string, userId: string, event: Partial<InsertEvent>): Promise<Event>;
  deleteEvent(id: string, userId: string): Promise<void>;
  toggleEventCompletion(id: string, userId: string): Promise<Event>;

  // Messages
  getMessages(eventId: string, userId: string): Promise<Message[]>;
  createMessage(userId: string, message: InsertMessage): Promise<Message>;
  deleteMessage(id: string, userId: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private familyMembers: Map<string, FamilyMember>;
  private events: Map<string, Event>;
  private messages: Map<string, Message>;
  private users: Map<string, User>;

  constructor() {
    this.familyMembers = new Map();
    this.events = new Map();
    this.messages = new Map();
    this.users = new Map();
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(user: UpsertUser): Promise<User> {
    const id = user.id;
    const existingUser = this.users.get(id);
    const userData: User = {
      ...existingUser,
      ...user,
      id,
      createdAt: existingUser?.createdAt || new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, userData);
    return userData;
  }

  // Family Members
  async getFamilyMembers(userId: string): Promise<FamilyMember[]> {
    return Array.from(this.familyMembers.values()).filter(m => m.userId === userId);
  }

  async getFamilyMember(id: string, userId: string): Promise<FamilyMember | undefined> {
    const member = this.familyMembers.get(id);
    return member && member.userId === userId ? member : undefined;
  }

  async createFamilyMember(userId: string, insertMember: InsertFamilyMember): Promise<FamilyMember> {
    const id = randomUUID();
    const member: FamilyMember = { 
      ...insertMember, 
      id, 
      userId,
      createdAt: new Date(),
    };
    this.familyMembers.set(id, member);
    return member;
  }

  async updateFamilyMember(id: string, userId: string, updates: Partial<FamilyMember>): Promise<FamilyMember> {
    const existingMember = this.familyMembers.get(id);
    if (!existingMember || existingMember.userId !== userId) {
      throw new NotFoundError(`Family member with id ${id} not found`);
    }
    
    const updatedMember: FamilyMember = {
      ...existingMember,
      ...updates,
      id,
      userId,
    };
    this.familyMembers.set(id, updatedMember);
    return updatedMember;
  }

  async deleteFamilyMember(id: string, userId: string): Promise<void> {
    const member = this.familyMembers.get(id);
    if (!member || member.userId !== userId) {
      throw new NotFoundError(`Family member with id ${id} not found`);
    }
    
    this.familyMembers.delete(id);
    
    const eventsToUpdate = Array.from(this.events.entries())
      .filter(([_, event]) => event.memberIds.includes(id) && event.userId === userId);
    
    eventsToUpdate.forEach(([eventId, event]) => {
      const updatedMemberIds = event.memberIds.filter(memberId => memberId !== id);
      if (updatedMemberIds.length === 0) {
        this.events.delete(eventId);
        
        const messagesToDelete = Array.from(this.messages.entries())
          .filter(([_, message]) => message.eventId === eventId && message.userId === userId)
          .map(([messageId, _]) => messageId);
        
        messagesToDelete.forEach(messageId => this.messages.delete(messageId));
      } else {
        this.events.set(eventId, { ...event, memberIds: updatedMemberIds });
      }
    });
  }

  // Events
  async getEvents(userId: string): Promise<Event[]> {
    return Array.from(this.events.values()).filter(e => e.userId === userId);
  }

  async getEvent(id: string, userId: string): Promise<Event | undefined> {
    const event = this.events.get(id);
    return event && event.userId === userId ? event : undefined;
  }

  async createEvent(userId: string, insertEvent: InsertEvent): Promise<Event> {
    const id = randomUUID();
    const event: Event = {
      ...insertEvent,
      id,
      userId,
      description: insertEvent.description || null,
      photoUrl: insertEvent.photoUrl || null,
      completed: false,
      completedAt: null,
      createdAt: new Date(),
    };
    this.events.set(id, event);
    return event;
  }

  async updateEvent(id: string, userId: string, updateData: Partial<InsertEvent>): Promise<Event> {
    const existingEvent = this.events.get(id);
    if (!existingEvent || existingEvent.userId !== userId) {
      throw new NotFoundError(`Event with id ${id} not found`);
    }
    
    const updatedEvent: Event = {
      ...existingEvent,
      ...updateData,
      id,
      userId,
      startTime: updateData.startTime ? new Date(updateData.startTime) : existingEvent.startTime,
      endTime: updateData.endTime ? new Date(updateData.endTime) : existingEvent.endTime,
      description: updateData.description !== undefined ? updateData.description : existingEvent.description,
      photoUrl: updateData.photoUrl !== undefined ? updateData.photoUrl : existingEvent.photoUrl,
    };
    this.events.set(id, updatedEvent);
    return updatedEvent;
  }

  async deleteEvent(id: string, userId: string): Promise<void> {
    const event = this.events.get(id);
    if (!event || event.userId !== userId) {
      throw new NotFoundError(`Event with id ${id} not found`);
    }
    
    this.events.delete(id);
    
    const messagesToDelete = Array.from(this.messages.entries())
      .filter(([_, message]) => message.eventId === id && message.userId === userId)
      .map(([messageId, _]) => messageId);
    
    messagesToDelete.forEach(messageId => this.messages.delete(messageId));
  }

  async toggleEventCompletion(id: string, userId: string): Promise<Event> {
    const event = this.events.get(id);
    if (!event || event.userId !== userId) {
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
  async getMessages(eventId: string, userId: string): Promise<Message[]> {
    return Array.from(this.messages.values()).filter(m => m.eventId === eventId && m.userId === userId);
  }

  async createMessage(userId: string, insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      ...insertMessage,
      id,
      userId,
      createdAt: new Date(),
    };
    this.messages.set(id, message);
    return message;
  }

  async deleteMessage(id: string, userId: string): Promise<void> {
    const message = this.messages.get(id);
    if (!message || message.userId !== userId) {
      throw new NotFoundError(`Message with id ${id} not found`);
    }
    this.messages.delete(id);
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

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const result = await this.db
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
    return result[0];
  }

  // Family Members
  async getFamilyMembers(userId: string): Promise<FamilyMember[]> {
    return await this.db.select().from(familyMembers).where(eq(familyMembers.userId, userId));
  }

  async getFamilyMember(id: string, userId: string): Promise<FamilyMember | undefined> {
    const result = await this.db.select().from(familyMembers).where(
      and(eq(familyMembers.id, id), eq(familyMembers.userId, userId))
    );
    return result[0];
  }

  async createFamilyMember(userId: string, insertMember: InsertFamilyMember): Promise<FamilyMember> {
    const result = await this.db.insert(familyMembers).values({
      ...insertMember,
      userId,
    }).returning();
    return result[0];
  }

  async updateFamilyMember(id: string, userId: string, updates: Partial<FamilyMember>): Promise<FamilyMember> {
    const result = await this.db.update(familyMembers).set(updates).where(
      and(eq(familyMembers.id, id), eq(familyMembers.userId, userId))
    ).returning();
    if (!result[0]) {
      throw new NotFoundError(`Family member with id ${id} not found`);
    }
    return result[0];
  }

  async deleteFamilyMember(id: string, userId: string): Promise<void> {
    const result = await this.db.delete(familyMembers).where(
      and(eq(familyMembers.id, id), eq(familyMembers.userId, userId))
    ).returning();
    if (!result[0]) {
      throw new NotFoundError(`Family member with id ${id} not found`);
    }
  }

  // Events
  async getEvents(userId: string): Promise<Event[]> {
    return await this.db.select().from(events).where(eq(events.userId, userId));
  }

  async getEvent(id: string, userId: string): Promise<Event | undefined> {
    const result = await this.db.select().from(events).where(
      and(eq(events.id, id), eq(events.userId, userId))
    );
    return result[0];
  }

  async createEvent(userId: string, insertEvent: InsertEvent): Promise<Event> {
    const result = await this.db.insert(events).values({
      ...insertEvent,
      userId,
    }).returning();
    return result[0];
  }

  async updateEvent(id: string, userId: string, updateData: Partial<InsertEvent>): Promise<Event> {
    const result = await this.db.update(events).set(updateData).where(
      and(eq(events.id, id), eq(events.userId, userId))
    ).returning();
    if (!result[0]) {
      throw new NotFoundError(`Event with id ${id} not found`);
    }
    return result[0];
  }

  async deleteEvent(id: string, userId: string): Promise<void> {
    const result = await this.db.delete(events).where(
      and(eq(events.id, id), eq(events.userId, userId))
    ).returning();
    if (!result[0]) {
      throw new NotFoundError(`Event with id ${id} not found`);
    }
  }

  async toggleEventCompletion(id: string, userId: string): Promise<Event> {
    const event = await this.getEvent(id, userId);
    if (!event) {
      throw new NotFoundError(`Event with id ${id} not found`);
    }

    const updatedEvent = {
      completed: !event.completed,
      completedAt: !event.completed ? new Date() : null,
    };

    const result = await this.db.update(events).set(updatedEvent).where(
      and(eq(events.id, id), eq(events.userId, userId))
    ).returning();
    return result[0];
  }

  // Messages
  async getMessages(eventId: string, userId: string): Promise<Message[]> {
    return await this.db.select().from(messages).where(
      and(eq(messages.eventId, eventId), eq(messages.userId, userId))
    );
  }

  async createMessage(userId: string, insertMessage: InsertMessage): Promise<Message> {
    const result = await this.db.insert(messages).values({
      ...insertMessage,
      userId,
    }).returning();
    return result[0];
  }

  async deleteMessage(id: string, userId: string): Promise<void> {
    await this.db.delete(messages).where(
      and(eq(messages.id, id), eq(messages.userId, userId))
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

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.getStorage(id).getUser(id);
  }

  async upsertUser(user: UpsertUser): Promise<User> {
    return this.getStorage(user.id).upsertUser(user);
  }

  // Family Members
  async getFamilyMembers(userId: string): Promise<FamilyMember[]> {
    return this.getStorage(userId).getFamilyMembers(userId);
  }

  async getFamilyMember(id: string, userId: string): Promise<FamilyMember | undefined> {
    return this.getStorage(userId).getFamilyMember(id, userId);
  }

  async createFamilyMember(userId: string, member: InsertFamilyMember): Promise<FamilyMember> {
    return this.getStorage(userId).createFamilyMember(userId, member);
  }

  async updateFamilyMember(id: string, userId: string, updates: Partial<FamilyMember>): Promise<FamilyMember> {
    return this.getStorage(userId).updateFamilyMember(id, userId, updates);
  }

  async deleteFamilyMember(id: string, userId: string): Promise<void> {
    return this.getStorage(userId).deleteFamilyMember(id, userId);
  }

  // Events
  async getEvents(userId: string): Promise<Event[]> {
    return this.getStorage(userId).getEvents(userId);
  }

  async getEvent(id: string, userId: string): Promise<Event | undefined> {
    return this.getStorage(userId).getEvent(id, userId);
  }

  async createEvent(userId: string, event: InsertEvent): Promise<Event> {
    return this.getStorage(userId).createEvent(userId, event);
  }

  async updateEvent(id: string, userId: string, event: Partial<InsertEvent>): Promise<Event> {
    return this.getStorage(userId).updateEvent(id, userId, event);
  }

  async deleteEvent(id: string, userId: string): Promise<void> {
    return this.getStorage(userId).deleteEvent(id, userId);
  }

  async toggleEventCompletion(id: string, userId: string): Promise<Event> {
    return this.getStorage(userId).toggleEventCompletion(id, userId);
  }

  // Messages
  async getMessages(eventId: string, userId: string): Promise<Message[]> {
    return this.getStorage(userId).getMessages(eventId, userId);
  }

  async createMessage(userId: string, message: InsertMessage): Promise<Message> {
    return this.getStorage(userId).createMessage(userId, message);
  }

  async deleteMessage(id: string, userId: string): Promise<void> {
    return this.getStorage(userId).deleteMessage(id, userId);
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
