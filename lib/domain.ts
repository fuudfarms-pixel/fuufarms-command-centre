/**
 * Domain vocabulary shared by server actions and the forms that post to them.
 *
 * These deliberately do NOT live in the `'use server'` action modules. Next
 * rewrites every export of such a module into an async server-action reference,
 * so an exported array arrives in a client component as a function — which fails
 * at render, not at build. Keep plain data here.
 */

export const INCOME_CATEGORIES = [
  'Sales',
  'Commission',
  'Loan',
  'Investment',
  'Other income',
] as const;

export const EXPENSE_CATEGORIES = [
  'Procurement',
  'Logistics',
  'Salaries',
  'Rent',
  'Marketing',
  'Equipment',
  'Tax',
  'Other expense',
] as const;

export const UNITS = ['Litre', 'Kg', 'Bag', 'Carton', 'Bottle', 'Drum', 'Tonne'] as const;

export const ASSET_CATEGORIES = [
  'equipment',
  'vehicle',
  'land',
  'technology',
  'other',
] as const;

export const ADJUSTMENT_REASONS = ['adjustment', 'spoilage'] as const;

export const CAPITAL_DIRECTIONS = ['in', 'out'] as const;
