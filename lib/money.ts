/**
 * Money is stored as an integer number of kobo and never as a float.
 *
 * The original tracker did naira arithmetic in JS numbers — `qty * costPerUnit`
 * straight off form inputs — which drifts as soon as fractions appear and is the
 * classic way ledgers stop reconciling. Everything below the API boundary is
 * kobo; naira exists only for display and for parsing user input.
 */

export const KOBO_PER_NAIRA = 100;

/** Parse a user-entered naira amount ("7,500.50") into kobo. Returns null if unparseable. */
export function nairaToKobo(input: string | number): number | null {
  const raw = typeof input === 'number' ? String(input) : input.trim().replace(/[₦,\s]/g, '');
  if (raw === '' || !/^-?\d*\.?\d*$/.test(raw)) return null;

  const value = Number(raw);
  if (!Number.isFinite(value)) return null;

  // Round rather than truncate so 0.015 does not silently become 0.01.
  return Math.round(value * KOBO_PER_NAIRA);
}

export function koboToNaira(kobo: number): number {
  return kobo / KOBO_PER_NAIRA;
}

const nairaFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Full amount, e.g. ₦7,500,000 */
export function formatKobo(kobo: number): string {
  return nairaFormatter.format(koboToNaira(kobo));
}

/** Abbreviated, for KPI tiles and chart axes where space is tight: ₦7.50M */
export function formatKoboShort(kobo: number): string {
  const naira = koboToNaira(kobo);
  const abs = Math.abs(naira);
  const sign = naira < 0 ? '-' : '';

  if (abs >= 1_000_000) return `${sign}₦${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}₦${(abs / 1_000).toFixed(1)}K`;
  return `${sign}₦${abs.toFixed(0)}`;
}

/**
 * Percentage of `part` out of `whole`, to one decimal place. Returns 0 when
 * `whole` is 0 rather than NaN or Infinity — a margin on nothing is not a number
 * worth showing, and NaN leaking into a KPI tile reads as a bug.
 */
export function percent(part: number, whole: number): number {
  if (whole === 0) return 0;
  return Math.round((part / whole) * 1000) / 10;
}
