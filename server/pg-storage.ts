import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import {
  familyMembers,
  events,
  messages,
  type FamilyMember,
  type InsertFamilyMember,
  type Event,
  type InsertEvent,
  type Message,
  type InsertMessage,
} from "@shared/schema";
import type { IStorage } from "./storage";

export class PgStorage implements IStorage {
  private db;

  constructor() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.db = drizzle(pool);
  }

  // Family Members
  async getFamilyMembers(): Promise<FamilyMember[]> {
    return await this.db.select().from(familyMembers);
  }

  async getFamilyMember(id: string): Promise<FamilyMember | undefined> {
    const result = await this.db
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.id, id))
      .limit(1);
    return result[0];
  }

  async createFamilyMember(member: InsertFamilyMember): Promise<FamilyMember> {
    const result = await this.db
      .insert(familyMembers)
      .values(member)
      .returning();
    return result[0];
  }

  async deleteFamilyMember(id: string): Promise<void> {
    // Delete events associated with this member
    await this.db
      .delete(events)
      .where(eq(events.memberId, id));

    // Delete the member
    await this.db
      .delete(familyMembers)
      .where(eq(familyMembers.id, id));
  }

  // Events
  async getEvents(): Promise<Event[]> {
    return await this.db.select().from(events);
  }

  async getEvent(id: string): Promise<Event | undefined> {
    const result = await this.db
      .select()
      .from(events)
      .where(eq(events.id, id))
      .limit(1);
    return result[0];
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const result = await this.db
      .insert(events)
      .values(event)
      .returning();
    return result[0];
  }

  async updateEvent(id: string, updateData: Partial<InsertEvent>): Promise<Event> {
    const result = await this.db
      .update(events)
      .set(updateData)
      .where(eq(events.id, id))
      .returning();
    
    if (!result[0]) {
      throw new Error(`Event with id ${id} not found`);
    }
    
    return result[0];
  }

  async deleteEvent(id: string): Promise<void> {
    // Delete messages associated with this event
    await this.db
      .delete(messages)
      .where(eq(messages.eventId, id));

    // Delete the event
    await this.db
      .delete(events)
      .where(eq(events.id, id));
  }

  // Messages
  async getMessages(): Promise<Message[]> {
    const result = await this.db
      .select()
      .from(messages)
      .orderBy(messages.createdAt);
    return result.reverse(); // Most recent first
  }

  async getMessagesByEvent(eventId: string): Promise<Message[]> {
    const result = await this.db
      .select()
      .from(messages)
      .where(eq(messages.eventId, eventId))
      .orderBy(messages.createdAt);
    return result.reverse(); // Most recent first
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const result = await this.db
      .insert(messages)
      .values(message)
      .returning();
    return result[0];
  }
}
