/**
 * Kept out of actions.ts: a 'use server' module may only export async functions,
 * so re-exporting a type from it fails the build.
 */
export interface ManagedUser {
  id: string;
  email: string;
  name: string;
  role: string | null;
  banned: boolean;
  createdAt: string;
}
