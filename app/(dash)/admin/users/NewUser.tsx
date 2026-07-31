'use client';

import { useActionState, useEffect, useState } from 'react';
import { Field } from '@/components/Form';
import { createUser } from './actions';
import { ROLES, ROLE_LABELS } from '@/lib/auth/roles';
import type { ActionState } from '@/lib/forms';
import styles from '../../page.module.css';

const initial: ActionState = { error: null };

export function NewUser() {
  const [state, formAction, pending] = useActionState(createUser, initial);
  const [password, setPassword] = useState<string | null>(null);

  useEffect(() => {
    const withPassword = state as ActionState & { password?: string };
    if (state.ok && withPassword.password) setPassword(withPassword.password);
  }, [state]);

  return (
    <>
      {state.error && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}

      {password && (
        <div
          style={{
            background: 'var(--ff-cream-50)',
            border: '1.5px solid var(--ff-gold)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 14px',
            marginBottom: 14,
            fontSize: 13,
          }}
          role="status"
        >
          <strong>Account created.</strong> Give them this password — it is shown once and
          is not stored anywhere:
          <div
            className="num"
            style={{
              fontSize: 16,
              fontWeight: 700,
              marginTop: 6,
              userSelect: 'all',
              wordBreak: 'break-all',
            }}
          >
            {password}
          </div>
        </div>
      )}

      <form action={formAction}>
        <div className={styles.form}>
          <Field label="Email" name="email" type="email" placeholder="name@fuudfarms.com" />
          <Field label="Display name" name="name" placeholder="Full name" />
          <Field
            label="Role"
            name="role"
            defaultValue="staff"
            options={ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
          />
          <button className={styles.submit} type="submit" disabled={pending}>
            {pending ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </>
  );
}
