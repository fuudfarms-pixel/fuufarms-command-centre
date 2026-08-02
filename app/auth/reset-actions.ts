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

  // Do NOT swallow failures here. Neon already protects against address
  // enumeration itself — it answers "if this email exists in our system, check
  // your email" whether or not the account is real — so there is nothing to hide
  // by catching. Swallowing only hid a genuine 403 (the deployed origin was not
  // in Neon's trusted list), which showed "check your email" while no email was
  // ever sent, and made a configuration problem look like broken delivery.
  try {
    const { error } = await getAuth().requestPasswordReset({
      email,
      redirectTo: `${origin}/auth/reset-password`,
    });

    if (error) {
      console.error('requestPasswordReset rejected', error);
      return {
        error:
          'Could not send the reset email. This is a configuration problem, not a wrong ' +
          'address — tell whoever administers this site.',
      };
    }
  } catch (e) {
    console.error('requestPasswordReset threw', e);
    return { error: 'Could not reach the sign-in service. Try again in a moment.' };
  }

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
