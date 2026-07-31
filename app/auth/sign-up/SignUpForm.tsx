'use client';

import { useActionState } from 'react';
import { signUp, type AuthFormState } from '../actions';
import styles from '../auth.module.css';

const initial: AuthFormState = { error: null };

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUp, initial);

  return (
    <form action={formAction}>
      {state.error && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}

      <div className={styles.field}>
        <label className={styles.label} htmlFor="invite">
          Invite code
        </label>
        <input className={styles.input} id="invite" name="invite" type="text" required />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="name">
          Full name
        </label>
        <input className={styles.input} id="name" name="name" type="text" required />
      </div>

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
          autoComplete="new-password"
          minLength={12}
          required
        />
      </div>

      <button className={styles.submit} type="submit" disabled={pending}>
        {pending ? 'Creating…' : 'Create account'}
      </button>
    </form>
  );
}
