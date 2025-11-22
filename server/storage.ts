import { type FamilyMember, type InsertFamilyMember, type Event, type InsertEvent, type Message, type InsertMessage } from "@shared/schema";
import { randomUUID } from "crypto";

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export interface IStorage {
  // Family Members
  getFamilyMembers(): Promise<FamilyMember[]>;
  getFamilyMember(id: string): Promise<FamilyMember | undefined>;
  createFamilyMember(member: InsertFamilyMember): Promise<FamilyMember>;
  updateFamilyMember(id: string, updates: Partial<FamilyMember>): Promise<FamilyMember>;
  deleteFamilyMember(id: string): Promise<void>;

  // Events
  getEvents(): Promise<Event[]>;
  getEvent(id: string): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: string, event: Partial<InsertEvent>): Promise<Event>;
  deleteEvent(id: string): Promise<void>;
  toggleEventCompletion(id: string): Promise<Event>;

  // Messages
  getMessages(eventId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  deleteMessage(id: string): Promise<void>;
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
    const sebby: FamilyMember = {
      id: randomUUID(),
      name: 'Sebby',
      color: '#10B981',
      avatar: null,
    };
    
    this.familyMembers.set(member1.id, member1);
    this.familyMembers.set(member2.id, member2);
    this.familyMembers.set(sebby.id, sebby);

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
        memberId: member1.id,
        color: member1.color,
        photoUrl: null,
        completed: false,
        completedAt: null,
      },
      {
        id: randomUUID(),
        title: 'Brunch with Mom',
        description: 'Family time',
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 0),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 30),
        memberId: member2.id,
        color: member2.color,
        photoUrl: null,
        completed: false,
        completedAt: null,
      },
      // Earlier this week
      {
        id: randomUUID(),
        title: 'Dinner with Emma',
        description: null,
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3, 17, 30),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3, 19, 0),
        memberId: member1.id,
        color: member1.color,
        photoUrl: null,
        completed: false,
        completedAt: null,
      },
      {
        id: randomUUID(),
        title: 'Grocery Shopping',
        description: null,
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 4, 11, 0),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 4, 12, 0),
        memberId: member1.id,
        color: member1.color,
        photoUrl: null,
        completed: true,
        completedAt: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 4, 12, 0),
      },
      {
        id: randomUUID(),
        title: 'Sebby\'s Birthday',
        description: null,
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2, 9, 0),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2, 11, 0),
        memberId: member2.id,
        color: member2.color,
        photoUrl: null,
        completed: true,
        completedAt: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2, 11, 0),
      },
      {
        id: randomUUID(),
        title: 'Pack for trip',
        description: null,
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 9, 0),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 10, 0),
        memberId: member1.id,
        color: member1.color,
        photoUrl: null,
        completed: true,
        completedAt: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 10, 0),
      },
      // Later this week
      {
        id: randomUUID(),
        title: 'Project Meeting',
        description: null,
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 13, 0),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 14, 0),
        memberId: member2.id,
        color: member2.color,
        photoUrl: null,
        completed: false,
        completedAt: null,
      },
      {
        id: randomUUID(),
        title: 'Workout',
        description: null,
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 9, 0),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 10, 0),
        memberId: member1.id,
        color: member1.color,
        photoUrl: null,
        completed: false,
        completedAt: null,
      },
      {
        id: randomUUID(),
        title: 'Pick up rental car',
        description: null,
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 12, 0),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 13, 0),
        memberId: member2.id,
        color: member2.color,
        photoUrl: null,
        completed: false,
        completedAt: null,
      },
      {
        id: randomUUID(),
        title: 'Dr. Schwartz',
        description: null,
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 8, 30),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 9, 30),
        memberId: member1.id,
        color: member1.color,
        photoUrl: null,
        completed: false,
        completedAt: null,
      },
      {
        id: randomUUID(),
        title: 'Zoo visit',
        description: null,
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 14, 0),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 16, 0),
        memberId: member2.id,
        color: member2.color,
        photoUrl: null,
        completed: false,
        completedAt: null,
      },
      // Sebby's December 2025 School Lunches
      {
        id: randomUUID(),
        title: 'Lunch: Beef Hotdogs with Tater Tots',
        description: null,
        startTime: new Date(2025, 11, 2, 11, 30),
        endTime: new Date(2025, 11, 2, 12, 15),
        memberId: sebby.id,
        color: sebby.color,
        photoUrl: null,
        completed: false,
        completedAt: null,
      },
      {
        id: randomUUID(),
        title: 'Lunch: Pancakes with Sausage',
        description: null,
        startTime: new Date(2025, 11, 3, 11, 30),
        endTime: new Date(2025, 11, 3, 12, 15),
        memberId: sebby.id,
        color: sebby.color,
        photoUrl: null,
        completed: false,
        completedAt: null,
      },
      {
        id: randomUUID(),
        title: 'Lunch: Buttered Noodles with Peas and Garlic Bread',
        description: null,
        startTime: new Date(2025, 11, 5, 11, 30),
        endTime: new Date(2025, 11, 5, 12, 15),
        memberId: sebby.id,
        color: sebby.color,
        photoUrl: null,
        completed: false,
        completedAt: null,
      },
      {
        id: randomUUID(),
        title: 'Lunch: French Toast Sticks with Sausage',
        description: null,
        startTime: new Date(2025, 11, 10, 11, 30),
        endTime: new Date(2025, 11, 10, 12, 15),
        memberId: sebby.id,
        color: sebby.color,
        photoUrl: null,
        completed: false,
        completedAt: null,
      },
      {
        id: randomUUID(),
        title: 'Lunch: Mac & Cheese with Broccoli',
        description: null,
        startTime: new Date(2025, 11, 12, 11, 30),
        endTime: new Date(2025, 11, 12, 12, 15),
        memberId: sebby.id,
        color: sebby.color,
        photoUrl: null,
        completed: false,
        completedAt: null,
      },
      {
        id: randomUUID(),
        title: 'Lunch: Waffles with Sausage',
        description: null,
        startTime: new Date(2025, 11, 17, 11, 30),
        endTime: new Date(2025, 11, 17, 12, 15),
        memberId: sebby.id,
        color: sebby.color,
        photoUrl: null,
        completed: false,
        completedAt: null,
      },
      {
        id: randomUUID(),
        title: 'Lunch: Pasta with Marinara Sauce and Garlic Bread',
        description: null,
        startTime: new Date(2025, 11, 19, 11, 30),
        endTime: new Date(2025, 11, 19, 12, 15),
        memberId: sebby.id,
        color: sebby.color,
        photoUrl: null,
        completed: false,
        completedAt: null,
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

  async updateFamilyMember(id: string, updates: Partial<FamilyMember>): Promise<FamilyMember> {
    const existingMember = this.familyMembers.get(id);
    if (!existingMember) {
      throw new NotFoundError(`Family member with id ${id} not found`);
    }
    
    const updatedMember: FamilyMember = {
      ...existingMember,
      ...updates,
      id, // Ensure ID doesn't change
    };
    this.familyMembers.set(id, updatedMember);
    return updatedMember;
  }

  async deleteFamilyMember(id: string): Promise<void> {
    if (!this.familyMembers.has(id)) {
      throw new NotFoundError(`Family member with id ${id} not found`);
    }
    
    this.familyMembers.delete(id);
    
    // Get events associated with this member
    const eventsToDelete = Array.from(this.events.entries())
      .filter(([_, event]) => event.memberId === id)
      .map(([eventId, _]) => eventId);
    
    // Delete those events and their associated messages
    eventsToDelete.forEach(eventId => {
      this.events.delete(eventId);
      
      // Delete messages for this event
      const messagesToDelete = Array.from(this.messages.entries())
        .filter(([_, message]) => message.eventId === eventId)
        .map(([messageId, _]) => messageId);
      
      messagesToDelete.forEach(messageId => this.messages.delete(messageId));
    });
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
      photoUrl: insertEvent.photoUrl || null,
      completed: false,
      completedAt: null,
    };
    this.events.set(id, event);
    return event;
  }

  async updateEvent(id: string, updateData: Partial<InsertEvent>): Promise<Event> {
    const existingEvent = this.events.get(id);
    if (!existingEvent) {
      throw new NotFoundError(`Event with id ${id} not found`);
    }
    
    // Ensure dates are Date objects after merge
    const updatedEvent: Event = {
      ...existingEvent,
      ...updateData,
      id,
      startTime: updateData.startTime ? new Date(updateData.startTime) : existingEvent.startTime,
      endTime: updateData.endTime ? new Date(updateData.endTime) : existingEvent.endTime,
      description: updateData.description !== undefined ? updateData.description : existingEvent.description,
      photoUrl: updateData.photoUrl !== undefined ? updateData.photoUrl : existingEvent.photoUrl,
    };
    this.events.set(id, updatedEvent);
    return updatedEvent;
  }

  async deleteEvent(id: string): Promise<void> {
    if (!this.events.has(id)) {
      throw new NotFoundError(`Event with id ${id} not found`);
    }
    
    this.events.delete(id);
    
    // Also delete messages for this event
    const messagesToDelete = Array.from(this.messages.entries())
      .filter(([_, message]) => message.eventId === id)
      .map(([messageId, _]) => messageId);
    
    messagesToDelete.forEach(messageId => this.messages.delete(messageId));
  }

  async toggleEventCompletion(id: string): Promise<Event> {
    const event = this.events.get(id);
    if (!event) {
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
  async getMessages(eventId: string): Promise<Message[]> {
    return Array.from(this.messages.values()).filter(m => m.eventId === eventId);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    // Validate that event exists
    const event = this.events.get(insertMessage.eventId);
    if (!event) {
      throw new NotFoundError(`Event with id ${insertMessage.eventId} not found`);
    }
    
    // Validate that member exists
    const member = this.familyMembers.get(insertMessage.memberId);
    if (!member) {
      throw new NotFoundError(`Family member with id ${insertMessage.memberId} not found`);
    }
    
    const id = randomUUID();
    const message: Message = {
      ...insertMessage,
      id,
      createdAt: new Date(),
    };
    this.messages.set(id, message);
    return message;
  }

  async deleteMessage(id: string): Promise<void> {
    this.messages.delete(id);
  }
}

export const storage = new MemStorage();
