'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { orderLines, orders } from '@/db/schema';
import { requireRole } from '@/lib/auth/guard';
import { record } from '@/lib/audit';
import { fulfilOrder, FulfilmentError } from '@/lib/fulfil';
import { type ActionState, ok, fail, text, money, quantity, isoDate } from '@/lib/forms';

export async function createOrder(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireRole('staff');

  const customer = text(form, 'customer');
  const itemId = text(form, 'itemId');
  const qty = quantity(form, 'qty');
  const unitPriceKobo = money(form, 'unitPrice');

  if (!customer) return fail('Who is the order for?');
  if (!itemId) return fail('Choose a product.');
  if (qty === null) return fail('Enter a quantity greater than zero.');
  if (unitPriceKobo === null) return fail('Enter a valid unit price.');

  await db.transaction(async (tx) => {
    const [order] = await tx
      .insert(orders)
      .values({
        customer,
        status: 'pending',
        occurredOn: isoDate(form, 'date'),
        createdBy: user.id,
      })
      .returning();

    await tx.insert(orderLines).values({ orderId: order.id, itemId, qty: String(qty), unitPriceKobo });
    await record(tx as never, user, 'order.create', 'orders', order.id, null, order);
  });

  revalidatePath('/orders');
  revalidatePath('/');
  return ok;
}

/**
 * Deliver an order: decrement stock and post the income, atomically.
 * See lib/fulfil.ts — the whole thing is one database transaction.
 */
export async function deliverOrder(id: string): Promise<void> {
  const user = await requireRole('staff');

  try {
    await fulfilOrder(user, id);
  } catch (e) {
    // FulfilmentError carries a message written for the person clicking the
    // button ("Not enough Palm Oil: 340 Litre on hand, 500 needed"), so let it
    // through. Anything else is a bug and should not leak its internals.
    if (e instanceof FulfilmentError) throw new Error(e.message);
    console.error('order fulfilment failed', e);
    throw new Error('Could not deliver that order. Nothing was changed.');
  }

  revalidatePath('/orders');
  revalidatePath('/inventory');
  revalidatePath('/transactions');
  revalidatePath('/');
}

export async function cancelOrder(id: string): Promise<void> {
  const user = await requireRole('staff');

  const [existing] = await db.select().from(orders).where(eq(orders.id, id));
  if (!existing) return;
  if (existing.fulfilledAt) {
    throw new Error('A delivered order cannot be cancelled. Record a return instead.');
  }

  await db.update(orders).set({ status: 'cancelled' }).where(eq(orders.id, id));
  await record(db as never, user, 'order.cancel', 'orders', id, existing, { status: 'cancelled' });
  revalidatePath('/orders');
  revalidatePath('/');
}
