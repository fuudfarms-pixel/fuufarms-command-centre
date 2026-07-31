'use client';

import { useActionState, useRef, useEffect } from 'react';
import type { ActionState } from '@/lib/forms';
import styles from '@/app/(dash)/page.module.css';

const initial: ActionState = { error: null };

/**
 * Wraps a server action with pending state, error display and a reset on
 * success, so each page's form is just its fields.
 */
export function Form({
  action,
  submitLabel,
  children,
}: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  submitLabel: string;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  const ref = useRef<HTMLFormElement>(null);

  // Clear the fields once the row is saved, so the next entry starts blank
  // rather than leaving stale values that look like they were submitted.
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={formAction}>
      {state.error && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}
      <div className={styles.form}>
        {children}
        <button className={styles.submit} type="submit" disabled={pending}>
          {pending ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}

export function Field({
  label,
  name,
  type = 'text',
  required = true,
  defaultValue,
  step,
  placeholder,
  options,
  value,
  onChange,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  step?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  /** Pass value+onChange to drive a select from parent state. */
  value?: string;
  onChange?: (value: string) => void;
}) {
  const controlled = value !== undefined && onChange !== undefined;

  return (
    <div className={styles.field}>
      <label htmlFor={name}>{label}</label>
      {options ? (
        <select
          id={name}
          name={name}
          required={required}
          {...(controlled
            ? { value, onChange: (e) => onChange(e.target.value) }
            : { defaultValue })}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          step={step}
          required={required}
          defaultValue={defaultValue}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

/** A submit button for one-off row actions (delete, fulfil) with pending state. */
export function RowAction({
  action,
  label,
  pendingLabel,
  confirm,
  primary = false,
}: {
  action: () => Promise<void>;
  label: string;
  pendingLabel: string;
  confirm?: string;
  primary?: boolean;
}) {
  const [, formAction, pending] = useActionState(async () => {
    await action();
    return null;
  }, null);

  return (
    <form
      action={formAction}
      style={{ display: 'inline' }}
      onSubmit={(e) => {
        // Deleting a ledger row is not recoverable from the UI, so make it deliberate.
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      <button
        type="submit"
        disabled={pending}
        className={`${styles.rowBtn} ${primary ? styles.rowBtnPrimary : ''}`}
      >
        {pending ? pendingLabel : label}
      </button>
    </form>
  );
}
