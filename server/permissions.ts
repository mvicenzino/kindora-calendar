import { ROLE_PERMISSIONS, type FamilyRole } from "@shared/schema";
import type { IStorage } from "./storage";

export interface PermissionContext {
  userId: string;
  familyId: string;
  role: FamilyRole;
}

// User ID set by API key bypass in replitAuth.ts for server-to-server calls
const API_KEY_USER_ID = '21601610';

export async function getUserFamilyRole(
  storage: IStorage,
  userId: string,
  familyId: string
): Promise<FamilyRole | null> {
  // API key users (e.g. Langly, OpenClaw) get admin access to all families
  if (userId === API_KEY_USER_ID) {
    return 'admin' as FamilyRole;
  }

  const membership = await storage.getUserFamilyMembership(userId, familyId);

  if (!membership) {
    return null;
  }

  return (membership.role as FamilyRole) || null;
}

export function checkPermission(role: FamilyRole, permission: keyof typeof ROLE_PERMISSIONS[FamilyRole]): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions?.[permission] ?? false;
}

export function hasPermission(context: PermissionContext, permission: keyof typeof ROLE_PERMISSIONS[FamilyRole]): boolean {
  return checkPermission(context.role, permission);
}

export class PermissionError extends Error {
  constructor(message: string = "You don't have permission to perform this action") {
    super(message);
    this.name = 'PermissionError';
  }
}

export function requirePermission(context: PermissionContext, permission: keyof typeof ROLE_PERMISSIONS[FamilyRole]): void {
  if (!hasPermission(context, permission)) {
    throw new PermissionError(`Permission denied: ${permission}`);
  }
}
