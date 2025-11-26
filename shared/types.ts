import type { Event as DBEvent, FamilyMember as DBFamilyMember } from "./schema";

/**
 * UI-ready Event type with:
 * - Null fields converted to undefined
 * - Timestamps converted to Date objects
 * - Additional view-specific fields
 */
export interface UiEvent extends Omit<DBEvent, 'description' | 'photoUrl' | 'completedAt' | 'startTime' | 'endTime'> {
  description?: string;
  photoUrl?: string;
  completedAt?: Date;
  startTime: Date;
  endTime: Date;
  members?: UiFamilyMember[];
  noteCount?: number;
}

/**
 * UI-ready FamilyMember type with:
 * - Null fields converted to undefined
 * - Additional view-specific fields
 */
export interface UiFamilyMember extends Omit<DBFamilyMember, 'avatar'> {
  avatar?: string;
  initials?: string;
}

/**
 * Convert database Event to UI Event
 * - Handles null → undefined conversion
 * - Converts timestamp strings to Date objects if needed
 */
export function mapEventFromDb(event: DBEvent & { startTime: Date | string; endTime: Date | string }): UiEvent {
  return {
    ...event,
    description: event.description ?? undefined,
    photoUrl: event.photoUrl ?? undefined,
    completedAt: event.completedAt ? new Date(event.completedAt) : undefined,
    startTime: typeof event.startTime === 'string' ? new Date(event.startTime) : event.startTime,
    endTime: typeof event.endTime === 'string' ? new Date(event.endTime) : event.endTime,
  };
}

/**
 * Convert database FamilyMember to UI FamilyMember
 * - Handles null → undefined conversion
 * - Adds initials generation
 */
export function mapFamilyMemberFromDb(member: DBFamilyMember): UiFamilyMember {
  return {
    ...member,
    avatar: member.avatar ?? undefined,
    initials: member.name.split(' ').map(n => n[0]).join('').toUpperCase(),
  };
}
