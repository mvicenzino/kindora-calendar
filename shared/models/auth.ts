export { users, sessions } from "../schema";

export type UpsertUser = {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  passwordHash?: string | null;
  authProvider?: string | null;
};

export type User = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  passwordHash: string | null;
  authProvider: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};
