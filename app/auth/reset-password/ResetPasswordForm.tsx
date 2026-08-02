'use client';

import { useActionState } from 'react';
import { submitReset } from '../reset-actions';
import type { AuthFormState } from '../actions';
import styles from '../auth.module.css';

const initial: AuthFormState = { error: null };

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(submitReset, initial);

  return (
    <form action={formAction}>
      {state.error && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}

      <input type="hidden" name="token" value={token} />

      <div className={styles.field}>
        <label className={styles.label} htmlFor="password">
          New password
        </label>
        <input
          className={styles.input}
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
          autoFocus
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="confirm">
          Confirm password
        </label>
        <input
          className={styles.input}
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
        />
      </div>

      <button className={styles.submit} type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Set password'}
      </button>
    </form>
  );
}
