import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, desc } from "drizzle-orm";
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
    const sql = neon(process.env.DATABASE_URL!);
    this.db = drizzle(sql);
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
    // Note: For now, we don't delete events when a member is deleted
    // since events may have multiple members. In a production app,
    // you'd want to either remove the member from memberIds or
    // delete events with only that member.

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
    return await this.db
      .select()
      .from(messages)
      .orderBy(desc(messages.createdAt)); // Most recent first
  }

  async getMessagesByEvent(eventId: string): Promise<Message[]> {
    return await this.db
      .select()
      .from(messages)
      .where(eq(messages.eventId, eventId))
      .orderBy(desc(messages.createdAt)); // Most recent first
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const result = await this.db
      .insert(messages)
      .values(message)
      .returning();
    return result[0];
  }
}
