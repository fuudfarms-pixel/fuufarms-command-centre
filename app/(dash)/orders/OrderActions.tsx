'use client';

import { useState, useTransition } from 'react';
import { deliverOrder, cancelOrder } from './actions';
import styles from '../page.module.css';

/**
 * Delivery can legitimately fail — most often "not enough stock" — so the error
 * is shown against the row rather than thrown away or bounced to an error page.
 */
export function OrderActions({ id, customer }: { id: string; customer: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <button
        className={`${styles.rowBtn} ${styles.rowBtnPrimary}`}
        disabled={pending}
        onClick={() =>
          run(
            () => deliverOrder(id),
            `Deliver the order for ${customer}? This reduces stock and records the income.`
          )
        }
      >
        {pending ? '…' : 'Deliver'}
      </button>
      <button
        className={styles.rowBtn}
        disabled={pending}
        onClick={() => run(() => cancelOrder(id), `Cancel the order for ${customer}?`)}
      >
        Cancel
      </button>
      {error && (
        <span className="neg" style={{ fontSize: 12 }} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
