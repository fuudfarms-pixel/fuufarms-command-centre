/**
 * Roles are stored by Neon Auth's admin plugin as a comma-separated string on the
 * user, so a user can hold several. Everything here treats that string as the
 * source of truth and never trusts a role passed in from the client.
 */
export const ROLES = ['superadmin', 'admin', 'staff'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  superadmin: 'Super admin',
  admin: 'Admin',
  staff: 'Staff',
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  superadmin: 'Full access, including user management.',
  admin: 'Full access to the ledger. Cannot manage users.',
  staff: 'Read the books and record entries. Cannot delete or manage users.',
};

/** Ranked most privileged first, so `>=` comparisons read naturally. */
const RANK: Record<Role, number> = { superadmin: 3, admin: 2, staff: 1 };

export function parseRoles(raw: string | null | undefined): Role[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((r) => r.trim().toLowerCase())
    .filter((r): r is Role => (ROLES as readonly string[]).includes(r));
}

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

/** True when the user holds `required` or anything more privileged. */
export function hasAtLeast(roles: Role[], required: Role): boolean {
  const best = roles.reduce((max, r) => Math.max(max, RANK[r]), 0);
  return best >= RANK[required];
}

export const canManageUsers = (roles: Role[]) => hasAtLeast(roles, 'superadmin');
export const canDelete = (roles: Role[]) => hasAtLeast(roles, 'admin');
export const canWrite = (roles: Role[]) => hasAtLeast(roles, 'staff');
