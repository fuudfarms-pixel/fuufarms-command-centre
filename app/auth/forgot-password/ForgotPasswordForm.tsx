'use client';

import { useActionState } from 'react';
import { requestReset } from '../reset-actions';
import type { AuthFormState } from '../actions';
import styles from '../auth.module.css';

const initial: AuthFormState = { error: null };

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestReset, initial);

  return (
    <form action={formAction}>
      {state.error && (
        <p className={styles.error} role="alert">
          {state.error}
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

      <button className={styles.submit} type="submit" disabled={pending}>
        {pending ? 'Sending…' : 'Email me a link'}
      </button>
    </form>
  );
}
