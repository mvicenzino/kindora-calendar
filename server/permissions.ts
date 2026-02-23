import { ROLE_PERMISSIONS, type FamilyRole, type PermissionKey } from "@shared/schema";
import type { IStorage } from "./storage";

export interface PermissionContext {
  userId: string;
  familyId: string;
  role: FamilyRole;
}

const API_KEY_USER_ID = '21601610';

export async function getUserFamilyRole(
  storage: IStorage,
  userId: string,
  familyId: string
): Promise<FamilyRole | null> {
  if (userId === API_KEY_USER_ID) {
    return 'owner' as FamilyRole;
  }

  const membership = await storage.getUserFamilyMembership(userId, familyId);

  if (!membership) {
    return null;
  }

  return (membership.role as FamilyRole) || null;
}

export function checkPermission(role: FamilyRole, permission: PermissionKey): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions?.[permission] ?? false;
}

export function hasPermission(context: PermissionContext, permission: PermissionKey): boolean {
  return checkPermission(context.role, permission);
}

export class PermissionError extends Error {
  constructor(message: string = "You don't have permission to perform this action") {
    super(message);
    this.name = 'PermissionError';
  }
}

export function requirePermission(context: PermissionContext, permission: PermissionKey): void {
  if (!hasPermission(context, permission)) {
    throw new PermissionError(`Permission denied: ${permission}`);
  }
}

export function getPermissionsForRole(role: FamilyRole): Record<PermissionKey, boolean> {
  return { ...ROLE_PERMISSIONS[role] };
}
