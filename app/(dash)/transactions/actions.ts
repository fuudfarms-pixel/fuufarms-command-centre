'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { transactions } from '@/db/schema';
import { requireRole, requireUser } from '@/lib/auth/guard';
import { record } from '@/lib/audit';
import { type ActionState, ok, fail, text, money, isoDate, oneOf } from '@/lib/forms';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '@/lib/domain';

export async function createTransaction(
  _prev: ActionState,
  form: FormData
): Promise<ActionState> {
  const user = await requireRole('staff');

  const type = oneOf(form, 'type', ['income', 'expense'] as const);
  const amountKobo = money(form, 'amount');
  const description = text(form, 'description');
  const category = text(form, 'category');

  if (!type) return fail('Choose income or expense.');
  if (amountKobo === null) return fail('Enter a valid amount.');
  if (amountKobo === 0) return fail('Amount must be more than zero.');
  if (!description) return fail('Add a short description.');
  if (!category) return fail('Choose a category.');

  // Guard against a posted category from the other type's list.
  const allowed: readonly string[] = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  if (!allowed.includes(category)) return fail('That category does not belong to this type.');

  const [row] = await db
    .insert(transactions)
    .values({
      type,
      category,
      amountKobo,
      description,
      occurredOn: isoDate(form, 'date'),
      createdBy: user.id,
    })
    .returning();

  await record(db as never, user, 'transaction.create', 'transactions', row.id, null, row);
  revalidatePath('/transactions');
  revalidatePath('/');
  return ok;
}

export async function deleteTransaction(id: string): Promise<void> {
  // Deleting rewrites history, so it needs more than the staff role.
  const user = await requireRole('admin');

  const [existing] = await db.select().from(transactions).where(eq(transactions.id, id));
  if (!existing) return;

  // A row posted by fulfilling an order must not be deleted on its own — the
  // stock movement would survive and the books would stop reconciling.
  if (existing.orderId) {
    throw new Error('This income came from a delivered order. Cancel the order instead.');
  }

  await db.delete(transactions).where(eq(transactions.id, id));
  await record(db as never, user, 'transaction.delete', 'transactions', id, existing, null);
  revalidatePath('/transactions');
  revalidatePath('/');
}

export async function whoAmI() {
  return requireUser();
}
