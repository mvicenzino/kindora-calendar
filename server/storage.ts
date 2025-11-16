import { type FamilyMember, type InsertFamilyMember, type Event, type InsertEvent, type Message, type InsertMessage } from "@shared/schema";
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

  // Messages
  getMessages(): Promise<Message[]>;
  getMessagesByEvent(eventId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
}

export class MemStorage implements IStorage {
  private familyMembers: Map<string, FamilyMember>;
  private events: Map<string, Event>;
  private messages: Map<string, Message>;

  constructor() {
    this.familyMembers = new Map();
    this.events = new Map();
    this.messages = new Map();
    
    // Initialize with default family members
    const member1: FamilyMember = {
      id: randomUUID(),
      name: 'Mike V',
      color: '#8B5CF6',
      avatar: null,
    };
    const member2: FamilyMember = {
      id: randomUUID(),
      name: 'Carolyn V',
      color: '#EC4899',
      avatar: null,
    };
    
    this.familyMembers.set(member1.id, member1);
    this.familyMembers.set(member2.id, member2);

    // Initialize with sample events for the week
    const today = new Date();
    const sampleEvents: Event[] = [
      // Today's events
      {
        id: randomUUID(),
        title: 'Date Night at Jockey Hollow',
        description: 'Evening out',
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 19, 30),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 0),
        memberIds: [member1.id],
        color: member1.color,
      },
      {
        id: randomUUID(),
        title: 'Brunch with Mom',
        description: 'Family time',
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 0),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 30),
        memberIds: [member2.id],
        color: member2.color,
      },
      // Earlier this week
      {
        id: randomUUID(),
        title: 'Dinner with Carolyn',
        description: null,
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3, 17, 30),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3, 19, 0),
        memberIds: [member1.id],
        color: member1.color,
      },
      {
        id: randomUUID(),
        title: 'Grocery Shopping',
        description: null,
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 4, 11, 0),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 4, 12, 0),
        memberIds: [member1.id],
        color: member1.color,
      },
      {
        id: randomUUID(),
        title: 'Sebby\'s Birthday',
        description: null,
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2, 9, 0),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2, 11, 0),
        memberIds: [member2.id],
        color: member2.color,
      },
      {
        id: randomUUID(),
        title: 'Pack for trip',
        description: null,
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 9, 0),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 10, 0),
        memberIds: [member1.id],
        color: member1.color,
      },
      // Later this week
      {
        id: randomUUID(),
        title: 'Project Meeting',
        description: null,
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 13, 0),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 14, 0),
        memberIds: [member2.id],
        color: member2.color,
      },
      {
        id: randomUUID(),
        title: 'Workout',
        description: null,
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 9, 0),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 10, 0),
        memberIds: [member1.id],
        color: member1.color,
      },
      {
        id: randomUUID(),
        title: 'Pick up rental car',
        description: null,
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 12, 0),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 13, 0),
        memberIds: [member2.id],
        color: member2.color,
      },
      {
        id: randomUUID(),
        title: 'Dr. Schwartz',
        description: null,
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 8, 30),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 9, 30),
        memberIds: [member1.id],
        color: member1.color,
      },
      {
        id: randomUUID(),
        title: 'Zoo visit',
        description: null,
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 14, 0),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 16, 0),
        memberIds: [member2.id],
        color: member2.color,
      },
    ];

    sampleEvents.forEach(event => this.events.set(event.id, event));

    // Initialize with sample messages (love notes)
    const eventIds = Array.from(this.events.keys());
    const sampleMessages: Message[] = [
      {
        id: randomUUID(),
        eventId: eventIds[0], // Date Night at Jockey Hollow
        senderName: member2.name,
        recipientId: member1.id,
        content: "Can't wait for tonight! Love you ❤️",
        createdAt: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1),
        fontWeight: 'normal',
        fontStyle: 'normal',
        emoji: '💕',
      },
      {
        id: randomUUID(),
        eventId: eventIds[1], // Brunch with Mom
        senderName: member1.name,
        recipientId: member2.id,
        content: "Enjoy brunch! Give mom a hug from me",
        createdAt: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 20, 0),
        fontWeight: 'normal',
        fontStyle: 'normal',
        emoji: '🤗',
      },
      {
        id: randomUUID(),
        eventId: eventIds[6], // Project Meeting
        senderName: member1.name,
        recipientId: member2.id,
        content: "Good luck with your presentation!",
        createdAt: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        fontWeight: 'bold',
        fontStyle: 'normal',
        emoji: '💪',
      },
    ];

    sampleMessages.forEach(message => this.messages.set(message.id, message));
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
    // Note: For now, we don't delete events when a member is deleted
    // since events may have multiple members. In a production app,
    // you'd want to either remove the member from memberIds or
    // delete events with only that member.
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
    
    // Ensure dates are Date objects after merge
    const updatedEvent: Event = {
      ...existingEvent,
      ...updateData,
      id,
      startTime: updateData.startTime ? new Date(updateData.startTime) : existingEvent.startTime,
      endTime: updateData.endTime ? new Date(updateData.endTime) : existingEvent.endTime,
      description: updateData.description !== undefined ? updateData.description : existingEvent.description,
    };
    this.events.set(id, updatedEvent);
    return updatedEvent;
  }

  async deleteEvent(id: string): Promise<void> {
    this.events.delete(id);
    // Also delete messages associated with this event
    const messagesToDelete = Array.from(this.messages.entries())
      .filter(([_, message]) => message.eventId === id)
      .map(([messageId, _]) => messageId);
    
    messagesToDelete.forEach(messageId => this.messages.delete(messageId));
  }

  // Messages
  async getMessages(): Promise<Message[]> {
    return Array.from(this.messages.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Most recent first
  }

  async getMessagesByEvent(eventId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.eventId === eventId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      ...insertMessage,
      id,
      createdAt: new Date(),
      fontWeight: insertMessage.fontWeight || null,
      fontStyle: insertMessage.fontStyle || null,
      emoji: insertMessage.emoji || null,
    };
    this.messages.set(id, message);
    return message;
  }
}

// Import PgStorage
import { PgStorage } from "./pg-storage";

// Use PostgreSQL storage if DATABASE_URL is available, otherwise fall back to MemStorage
export const storage: IStorage = process.env.DATABASE_URL 
  ? new PgStorage()
  : new MemStorage();
