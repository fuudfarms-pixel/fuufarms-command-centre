import { nairaToKobo } from './money';

export interface ActionState {
  error: string | null;
  ok?: boolean;
}

export const ok: ActionState = { error: null, ok: true };
export const fail = (message: string): ActionState => ({ error: message });

/** Read a required text field, trimmed. Returns null when absent or blank. */
export function text(form: FormData, name: string): string | null {
  const value = String(form.get(name) ?? '').trim();
  return value === '' ? null : value;
}

/** Read a naira money field and convert to kobo. Rejects junk and negatives. */
export function money(form: FormData, name: string): number | null {
  const raw = text(form, name);
  if (raw === null) return null;
  const kobo = nairaToKobo(raw);
  if (kobo === null || kobo < 0) return null;
  return kobo;
}

/** Read a positive quantity. Fractional is allowed — oil is sold in part-litres. */
export function quantity(form: FormData, name: string): number | null {
  const raw = text(form, name);
  if (raw === null) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

/** Read an ISO date, defaulting to today when blank. */
export function isoDate(form: FormData, name: string): string {
  const raw = text(form, name);
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return new Date().toISOString().slice(0, 10);
}

/** Read a value constrained to a known set — never trust a posted enum. */
export function oneOf<T extends string>(
  form: FormData,
  name: string,
  allowed: readonly T[]
): T | null {
  const raw = String(form.get(name) ?? '');
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : null;
}
