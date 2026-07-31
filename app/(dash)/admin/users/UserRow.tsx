'use client';

import { useState, useTransition } from 'react';
import { setRole, setBanned } from './actions';
import type { ManagedUser } from './types';
import { ROLES, ROLE_LABELS, parseRoles } from '@/lib/auth/roles';
import styles from '../../page.module.css';

export function UserRow({ user, isSelf }: { user: ManagedUser; isSelf: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const current = parseRoles(user.role)[0] ?? 'staff';

  const run = (fn: () => Promise<void>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setError(null);
    start(async () => {
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong.');
      }
    });
  };

  return (
    <tr>
      <td>
        {user.name}
        {isSelf && <span className={styles.lede}> · you</span>}
      </td>
      <td className={styles.lede}>{user.email}</td>
      <td>
        <select
          value={current}
          disabled={pending}
          onChange={(e) =>
            run(
              () => setRole(user.id, e.target.value),
              `Change ${user.name} to ${ROLE_LABELS[e.target.value as keyof typeof ROLE_LABELS]}?`
            )
          }
          style={{
            padding: '4px 8px',
            borderRadius: 'var(--radius-pill)',
            border: '1.5px solid var(--border-subtle)',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </td>
      <td>
        <span className={`${styles.pill} ${user.banned ? styles.pillOut : styles.pillDone}`}>
          {user.banned ? 'suspended' : 'active'}
        </span>
      </td>
      <td>
        {!isSelf && (
          <button
            className={styles.rowBtn}
            disabled={pending}
            onClick={() =>
              run(
                () => setBanned(user.id, !user.banned),
                user.banned
                  ? `Restore access for ${user.name}?`
                  : `Suspend ${user.name}? Their sessions end immediately.`
              )
            }
          >
            {pending ? '…' : user.banned ? 'Restore' : 'Suspend'}
          </button>
        )}
        {error && (
          <span className="neg" style={{ fontSize: 12, marginLeft: 8 }} role="alert">
            {error}
          </span>
        )}
      </td>
    </tr>
  );
}
