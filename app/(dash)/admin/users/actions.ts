'use server';

import { revalidatePath } from 'next/cache';
import { randomBytes } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { requireRole } from '@/lib/auth/guard';
import { record } from '@/lib/audit';
import { ROLES, isRole } from '@/lib/auth/roles';
import type { ManagedUser } from './types';
import { type ActionState, fail, text, oneOf } from '@/lib/forms';
import { requireEnv } from '@/lib/env';

/**
 * Neon Auth owns the `neon_auth` schema, so users are read with raw SQL rather
 * than through the Drizzle models — the shape belongs to the auth service and
 * mirroring it here would rot the first time they change it.
 */
export async function listUsers(): Promise<ManagedUser[]> {
  await requireRole('superadmin');

  const result = await db.execute(sql`
    select id, email, name, role, coalesce(banned, false) as banned, "createdAt"::text as "createdAt"
    from neon_auth."user"
    order by "createdAt" desc
  `);

  // Raw SQL against a schema we do not model, so the cast is the boundary where
  // an untyped row becomes a typed one.
  return result.rows as unknown as ManagedUser[];
}

export async function createUser(_prev: ActionState, form: FormData): Promise<ActionState> {
  const actor = await requireRole('superadmin');

  const email = text(form, 'email');
  const name = text(form, 'name');
  const role = oneOf(form, 'role', ROLES);

  if (!email) return fail('Enter an email.');
  if (!name) return fail('Enter a display name.');
  if (!role) return fail('Choose a role.');

  const existing = await db.execute(
    sql`select 1 from neon_auth."user" where email = ${email} limit 1`
  );
  if ((existing.rows ?? []).length > 0) return fail('That email already has an account.');

  const password = randomBytes(18).toString('base64url');

  const response = await fetch(`${requireEnv('NEON_AUTH_BASE_URL')}/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: requireEnv('APP_ORIGIN') },
    body: JSON.stringify({ email, name, password, callbackURL: requireEnv('APP_ORIGIN') }),
  });

  if (!response.ok) {
    console.error('createUser failed', response.status, await response.text());
    return fail('Could not create that account.');
  }

  await db.execute(sql`update neon_auth."user" set role = ${role} where email = ${email}`);
  await record(db as never, actor, 'user.create', 'neon_auth.user', email, null, { email, name, role });

  revalidatePath('/admin/users');

  // Shown once, in the UI, because there is no email delivery configured. The
  // password is never stored anywhere we can read it back.
  return { error: null, ok: true, ...({ password } as object) } as ActionState;
}

export async function setRole(userId: string, role: string): Promise<void> {
  const actor = await requireRole('superadmin');
  if (!isRole(role)) throw new Error('Unknown role.');

  // A super admin removing their own last privilege would lock everyone out of
  // user management with no way back in except SQL.
  if (userId === actor.id && role !== 'superadmin') {
    throw new Error('You cannot remove your own super admin role.');
  }

  await db.execute(sql`update neon_auth."user" set role = ${role} where id = ${userId}`);
  await record(db as never, actor, 'user.setRole', 'neon_auth.user', userId, null, { role });
  revalidatePath('/admin/users');
}

export async function setBanned(userId: string, banned: boolean): Promise<void> {
  const actor = await requireRole('superadmin');
  if (userId === actor.id) throw new Error('You cannot ban yourself.');

  await db.execute(sql`update neon_auth."user" set banned = ${banned} where id = ${userId}`);
  // Kill live sessions too — a ban that leaves the current session working is
  // not a ban.
  if (banned) {
    await db.execute(sql`delete from neon_auth.session where "userId" = ${userId}`);
  }

  await record(db as never, actor, banned ? 'user.ban' : 'user.unban', 'neon_auth.user', userId, null, null);
  revalidatePath('/admin/users');
}
