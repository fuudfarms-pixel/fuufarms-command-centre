'use server';

import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth/server';
import { requireEnv } from '@/lib/env';
import type { AuthFormState } from './actions';

/**
 * Password reset, which is also how an account first gets a password.
 *
 * The Neon Console can create a user but cannot set a password for them, so a
 * Console-created account has no way into an email/password app. This closes
 * that: the account is created in the Console, the person requests a reset here,
 * and Neon emails them a link to choose a password. It is also the ordinary
 * forgot-my-password path, which the app needed regardless.
 */
export async function requestReset(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get('email') ?? '').trim();
  if (!email) return { error: 'Enter your email address.' };

  const origin = requireEnv('APP_ORIGIN');

  try {
    await getAuth().requestPasswordReset({
      email,
      redirectTo: `${origin}/auth/reset-password`,
    });
  } catch (e) {
    console.error('requestPasswordReset failed', e);
    // Fall through to the same message either way — see below.
  }

  // Deliberately identical whether or not the address has an account. Telling
  // the difference would let anyone check who has access to the books.
  redirect('/auth/forgot-password?sent=1');
}

export async function submitReset(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const token = String(formData.get('token') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  if (!token) return { error: 'That reset link is missing its token. Request a new one.' };
  if (password !== confirm) return { error: 'The two passwords do not match.' };
  if (password.length < 12) {
    return { error: 'Use at least 12 characters — this account can see the books.' };
  }

  const { error } = await getAuth().resetPassword({ token, newPassword: password });

  if (error) {
    // Links expire after 15 minutes, which is the common failure here.
    return { error: 'That link is invalid or has expired. Request a new one.' };
  }

  redirect('/auth/sign-in?reset=1');
}
