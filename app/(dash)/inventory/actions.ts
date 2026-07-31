'use server';

import { revalidatePath } from 'next/cache';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { inventoryItems, inventoryMovements, transactions } from '@/db/schema';
import { requireRole } from '@/lib/auth/guard';
import { record } from '@/lib/audit';
import { type ActionState, ok, fail, text, money, quantity, isoDate, oneOf } from '@/lib/forms';
import { UNITS, ADJUSTMENT_REASONS } from '@/lib/domain';

export async function createItem(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireRole('staff');

  const product = text(form, 'product');
  const unit = oneOf(form, 'unit', UNITS);
  const costPerUnitKobo = money(form, 'cost');
  const marketPriceKobo = money(form, 'market');
  const supplier = text(form, 'supplier') ?? '';

  if (!product) return fail('Name the product.');
  if (!unit) return fail('Choose a unit.');
  if (costPerUnitKobo === null) return fail('Enter a valid cost per unit.');
  if (marketPriceKobo === null) return fail('Enter a valid market price.');

  const [row] = await db
    .insert(inventoryItems)
    .values({ product, unit, supplier, costPerUnitKobo, marketPriceKobo })
    .returning();

  await record(db as never, user, 'item.create', 'inventory_items', row.id, null, row);
  revalidatePath('/inventory');
  revalidatePath('/');
  return ok;
}

/**
 * Record stock coming in. Optionally posts the matching expense, so a purchase
 * is one action rather than two — the tracker made you remember to do both, and
 * forgetting silently broke the books.
 */
export async function receiveStock(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireRole('staff');

  const itemId = text(form, 'itemId');
  const qty = quantity(form, 'qty');
  const unitCostKobo = money(form, 'unitCost');
  const occurredOn = isoDate(form, 'date');
  const alsoExpense = form.get('alsoExpense') === 'on';

  if (!itemId) return fail('Choose a product.');
  if (qty === null) return fail('Enter a quantity greater than zero.');
  if (unitCostKobo === null) return fail('Enter a valid unit cost.');

  const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, itemId));
  if (!item) return fail('That product no longer exists.');

  await db.transaction(async (tx) => {
    await tx.insert(inventoryMovements).values({
      itemId,
      deltaQty: String(qty),
      reason: 'purchase',
      unitCostKobo,
      occurredOn,
      createdBy: user.id,
      note: `Received ${qty} ${item.unit}`,
    });

    if (alsoExpense) {
      await tx.insert(transactions).values({
        type: 'expense',
        category: 'Procurement',
        amountKobo: Math.round(qty * unitCostKobo),
        description: `${item.product} — ${qty} ${item.unit}`,
        occurredOn,
        createdBy: user.id,
      });
    }

    await record(tx as never, user, 'stock.receive', 'inventory_items', itemId, null, {
      qty,
      unitCostKobo,
      alsoExpense,
    });
  });

  revalidatePath('/inventory');
  revalidatePath('/transactions');
  revalidatePath('/');
  return ok;
}

export async function adjustStock(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireRole('admin');

  const itemId = text(form, 'itemId');
  const delta = Number(text(form, 'delta') ?? '');
  const reason = oneOf(form, 'reason', ADJUSTMENT_REASONS);
  const note = text(form, 'note') ?? '';

  if (!itemId) return fail('Choose a product.');
  if (!Number.isFinite(delta) || delta === 0) return fail('Enter a non-zero adjustment.');
  if (!reason) return fail('Choose a reason.');

  const [{ onHand }] = await db
    .select({ onHand: sql<string>`coalesce(sum(${inventoryMovements.deltaQty}), 0)` })
    .from(inventoryMovements)
    .where(eq(inventoryMovements.itemId, itemId));

  if (Number(onHand) + delta < 0) {
    return fail(`That would put stock below zero (${Number(onHand)} on hand).`);
  }

  await db.insert(inventoryMovements).values({
    itemId,
    deltaQty: String(delta),
    reason,
    occurredOn: isoDate(form, 'date'),
    createdBy: user.id,
    note,
  });

  await record(db as never, user, 'stock.adjust', 'inventory_items', itemId, null, { delta, reason, note });
  revalidatePath('/inventory');
  revalidatePath('/');
  return ok;
}

export async function archiveItem(id: string): Promise<void> {
  const user = await requireRole('admin');
  // Archive rather than delete: movements reference this row, and the history of
  // what was bought and sold has to survive.
  await db.update(inventoryItems).set({ archivedAt: new Date() }).where(eq(inventoryItems.id, id));
  await record(db as never, user, 'item.archive', 'inventory_items', id, null, null);
  revalidatePath('/inventory');
  revalidatePath('/');
}
