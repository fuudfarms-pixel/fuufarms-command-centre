'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { assets, transactions } from '@/db/schema';
import { requireRole } from '@/lib/auth/guard';
import { record } from '@/lib/audit';
import { type ActionState, ok, fail, text, money, isoDate, oneOf } from '@/lib/forms';
import { ASSET_CATEGORIES } from '@/lib/domain';

export async function createAsset(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireRole('staff');

  const name = text(form, 'name');
  const category = oneOf(form, 'category', ASSET_CATEGORIES);
  const valueKobo = money(form, 'value');
  const acquiredOn = isoDate(form, 'date');
  const alsoExpense = form.get('alsoExpense') === 'on';

  if (!name) return fail('Name the asset.');
  if (!category) return fail('Choose a category.');
  if (valueKobo === null) return fail('Enter a valid value.');

  await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(assets)
      .values({ name, category, valueKobo, acquiredOn, createdBy: user.id })
      .returning();

    // Buying an asset spends cash. Without this the asset appears from nowhere
    // and net worth jumps — which is precisely the bug the original had.
    if (alsoExpense) {
      await tx.insert(transactions).values({
        type: 'expense',
        category: 'Equipment',
        amountKobo: valueKobo,
        description: `Acquired ${name}`,
        occurredOn: acquiredOn,
        createdBy: user.id,
      });
    }

    await record(tx as never, user, 'asset.create', 'assets', row.id, null, row);
  });

  revalidatePath('/assets');
  revalidatePath('/transactions');
  revalidatePath('/');
  return ok;
}

export async function disposeAsset(id: string): Promise<void> {
  const user = await requireRole('admin');
  const today = new Date().toISOString().slice(0, 10);

  const [existing] = await db.select().from(assets).where(eq(assets.id, id));
  if (!existing || existing.disposedOn) return;

  // Disposal keeps the row and its history; it just leaves the balance sheet.
  await db.update(assets).set({ disposedOn: today }).where(eq(assets.id, id));
  await record(db as never, user, 'asset.dispose', 'assets', id, existing, { disposedOn: today });
  revalidatePath('/assets');
  revalidatePath('/');
}
