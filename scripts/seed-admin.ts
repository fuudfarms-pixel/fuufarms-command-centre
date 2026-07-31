/**
 * Bootstrap the first super admin.
 *
 *   npm run seed:admin -- <email> "<display name>"
 *
 * Chicken-and-egg: the admin plugin's createUser() needs an authenticated admin
 * session, and there is no admin yet. So this registers through the normal
 * sign-up endpoint and then promotes the row directly. That is the one moment
 * self-registration is needed — close it in the Neon Console immediately after.
 *
 * Prints the generated password once. It is never stored anywhere.
 */
import { loadEnv } from './env';
loadEnv();

import { randomBytes } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { requireEnv } from '../lib/env';

function strongPassword(): string {
  // 24 chars from a base64url alphabet — ~144 bits, no ambiguous-character games.
  return randomBytes(18).toString('base64url');
}

async function main() {
  const [email, name] = process.argv.slice(2);
  if (!email || !name) {
    console.error('Usage: npm run seed:admin -- <email> "<display name>"');
    process.exit(1);
  }

  const authBase = requireEnv('NEON_AUTH_BASE_URL');
  const sql = neon(requireEnv('DATABASE_URL'));

  const existing = await sql`select id, email, role from neon_auth."user" where email = ${email}`;

  if (existing.length > 0) {
    // Already registered — just make sure the role is right rather than failing.
    await sql`update neon_auth."user" set role = 'superadmin' where email = ${email}`;
    console.log(`\n${email} already existed — role set to superadmin.`);
    console.log('Password unchanged. Use "forgot password" if you need a new one.\n');
    return;
  }

  const password = strongPassword();

  const response = await fetch(`${authBase}/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000' },
    body: JSON.stringify({ email, name, password, callbackURL: 'http://localhost:3000/' }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Sign-up failed (${response.status}): ${body}`);
  }

  await sql`update neon_auth."user" set role = 'superadmin' where email = ${email}`;
  const [check] = await sql`select email, name, role from neon_auth."user" where email = ${email}`;

  console.log('\n  Super admin created');
  console.log('  ─────────────────────────────────────────────');
  console.log(`  Email     ${check.email}`);
  console.log(`  Name      ${check.name}`);
  console.log(`  Role      ${check.role}`);
  console.log(`  Password  ${password}`);
  console.log('  ─────────────────────────────────────────────');
  console.log('  Save the password now — it is not stored and cannot be shown again.');
  console.log('  Then close self-registration in the Neon Console.\n');
}

main().catch((e) => {
  console.error('\nseed failed:', e instanceof Error ? e.message : e);
  process.exit(1);
});
