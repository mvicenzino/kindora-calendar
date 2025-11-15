import { type FamilyMember, type InsertFamilyMember, type Event, type InsertEvent } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Family Members
  getFamilyMembers(): Promise<FamilyMember[]>;
  getFamilyMember(id: string): Promise<FamilyMember | undefined>;
  createFamilyMember(member: InsertFamilyMember): Promise<FamilyMember>;
  deleteFamilyMember(id: string): Promise<void>;

  // Events
  getEvents(): Promise<Event[]>;
  getEvent(id: string): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: string, event: Partial<InsertEvent>): Promise<Event>;
  deleteEvent(id: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private familyMembers: Map<string, FamilyMember>;
  private events: Map<string, Event>;

  constructor() {
    this.familyMembers = new Map();
    this.events = new Map();
    
    // Initialize with default family members
    const member1: FamilyMember = {
      id: randomUUID(),
      name: 'Mike V',
      color: '#8B5CF6',
      avatar: null,
    };
    const member2: FamilyMember = {
      id: randomUUID(),
      name: 'Claire V',
      color: '#EC4899',
      avatar: null,
    };
    
    this.familyMembers.set(member1.id, member1);
    this.familyMembers.set(member2.id, member2);

    // Initialize with sample events for today
    const today = new Date();
    const sampleEvents: Event[] = [
      {
        id: randomUUID(),
        title: 'Date Night at Jockey Hollow',
        description: 'Evening out',
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 19, 30),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 0),
        memberId: member1.id,
        color: member1.color,
      },
      {
        id: randomUUID(),
        title: 'Brunch with Mom',
        description: 'Family time',
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 0),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 30),
        memberId: member2.id,
        color: member2.color,
      },
    ];

    sampleEvents.forEach(event => this.events.set(event.id, event));
  }

  // Family Members
  async getFamilyMembers(): Promise<FamilyMember[]> {
    return Array.from(this.familyMembers.values());
  }

  async getFamilyMember(id: string): Promise<FamilyMember | undefined> {
    return this.familyMembers.get(id);
  }

  async createFamilyMember(insertMember: InsertFamilyMember): Promise<FamilyMember> {
    const id = randomUUID();
    const member: FamilyMember = { ...insertMember, id, avatar: insertMember.avatar || null };
    this.familyMembers.set(id, member);
    return member;
  }

  async deleteFamilyMember(id: string): Promise<void> {
    this.familyMembers.delete(id);
    // Also delete events associated with this member
    const eventsToDelete = Array.from(this.events.entries())
      .filter(([_, event]) => event.memberId === id)
      .map(([eventId, _]) => eventId);
    
    eventsToDelete.forEach(eventId => this.events.delete(eventId));
  }

  // Events
  async getEvents(): Promise<Event[]> {
    return Array.from(this.events.values());
  }

  async getEvent(id: string): Promise<Event | undefined> {
    return this.events.get(id);
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const id = randomUUID();
    const event: Event = {
      ...insertEvent,
      id,
      description: insertEvent.description || null,
    };
    this.events.set(id, event);
    return event;
  }

  async updateEvent(id: string, updateData: Partial<InsertEvent>): Promise<Event> {
    const existingEvent = this.events.get(id);
    if (!existingEvent) {
      throw new Error(`Event with id ${id} not found`);
    }
    
    const updatedEvent: Event = {
      ...existingEvent,
      ...updateData,
      id,
    };
    this.events.set(id, updatedEvent);
    return updatedEvent;
  }

  async deleteEvent(id: string): Promise<void> {
    this.events.delete(id);
  }
}

export const storage = new MemStorage();
