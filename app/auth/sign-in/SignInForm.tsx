'use client';

import { useActionState } from 'react';
import { signIn, type AuthFormState } from '../actions';
import styles from '../auth.module.css';

const initial: AuthFormState = { error: null };

export function SignInForm({ notice }: { notice: string | null }) {
  const [state, formAction, pending] = useActionState(signIn, initial);
  const message = state.error ?? notice;

  return (
    <form action={formAction}>
      {message && (
        <p className={styles.error} role="alert">
          {message}
        </p>
      )}

      <div className={styles.field}>
        <label className={styles.label} htmlFor="email">
          Email
        </label>
        <input
          className={styles.input}
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="password">
          Password
        </label>
        <input
          className={styles.input}
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      <button className={styles.submit} type="submit" disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
