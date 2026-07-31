'use server';

import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth/server';
import { requireEnv } from '@/lib/env';

export interface AuthFormState {
  error: string | null;
}

/**
 * Errors are deliberately vague: "Email or password is incorrect" rather than
 * "no such user". Distinguishing the two lets anyone enumerate who has an
 * account here, which for a company's books is worth avoiding.
 */
const SIGN_IN_FAILED = 'Email or password is incorrect.';

export async function signIn(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) return { error: 'Enter your email and password.' };

  const { error } = await getAuth().signIn.email({ email, password });
  if (error) return { error: SIGN_IN_FAILED };

  // redirect() signals by throwing, so it must sit outside any try/catch.
  redirect('/');
}

export async function signUp(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get('email') ?? '').trim();
  const name = String(formData.get('name') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const invite = String(formData.get('invite') ?? '');

  // Self-registration is closed unless an invite token is configured and matches.
  // Without this, anyone reaching the URL could read the company's finances.
  const expected = process.env.INVITE_TOKEN;
  if (!expected) {
    return { error: 'Self-registration is closed. Ask an administrator for an account.' };
  }
  if (invite !== expected) {
    return { error: 'That invite code is not valid.' };
  }

  if (!email || !name || !password) return { error: 'All fields are required.' };
  if (password.length < 12) {
    return { error: 'Use at least 12 characters — this account can see the books.' };
  }

  const { error } = await getAuth().signUp.email({ email, name, password });
  if (error) return { error: error.message || 'Could not create that account.' };

  redirect('/');
}

export async function signOut(): Promise<void> {
  await getAuth().signOut();
  redirect('/auth/sign-in');
}

/** Present so a misconfigured deploy fails at sign-in with a clear message. */
export async function assertConfigured(): Promise<void> {
  requireEnv('NEON_AUTH_BASE_URL');
  requireEnv('NEON_AUTH_COOKIE_SECRET');
}
