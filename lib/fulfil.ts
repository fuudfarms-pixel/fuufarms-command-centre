import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { inventoryItems, inventoryMovements, orderLines, orders, transactions } from '@/db/schema';
import { record } from './audit';
import type { CurrentUser } from './auth/guard';

export class FulfilmentError extends Error {}

export interface FulfilResult {
  orderId: string;
  incomeKobo: number;
  lines: { product: string; qty: number }[];
}

/**
 * Mark an order delivered: decrement stock and post the income, atomically.
 *
 * The original tracker did neither — changing a dropdown to "Delivered" moved a
 * label and nothing else, so every sale had to be entered a second time by hand
 * as a transaction, and stock silently never went down.
 *
 * All of it runs in one transaction. A partial apply here would decrement stock
 * without recording income (or the reverse), and the books would be wrong with
 * nothing to show why.
 */
export async function fulfilOrder(user: CurrentUser, orderId: string): Promise<FulfilResult> {
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for('update');

    if (!order) throw new FulfilmentError('That order no longer exists.');
    if (order.status === 'cancelled') {
      throw new FulfilmentError('A cancelled order cannot be delivered.');
    }
    // Idempotent: a double-click, a retry, or two people clicking at once must
    // not decrement stock twice. The row lock above serialises the racers; this
    // check stops the second one.
    if (order.fulfilledAt) {
      throw new FulfilmentError('That order has already been delivered.');
    }

    const lines = await tx
      .select({
        qty: orderLines.qty,
        unitPriceKobo: orderLines.unitPriceKobo,
        itemId: orderLines.itemId,
        product: inventoryItems.product,
        unit: inventoryItems.unit,
        costPerUnitKobo: inventoryItems.costPerUnitKobo,
      })
      .from(orderLines)
      .innerJoin(inventoryItems, eq(orderLines.itemId, inventoryItems.id))
      .where(eq(orderLines.orderId, orderId));

    if (lines.length === 0) throw new FulfilmentError('That order has no items on it.');

    let incomeKobo = 0;
    const applied: { product: string; qty: number }[] = [];

    for (const line of lines) {
      const qty = Number(line.qty);

      // Stock is derived from the movement ledger, so read it back the same way
      // rather than trusting a cached column.
      const [{ onHand }] = await tx
        .select({ onHand: sql<string>`coalesce(sum(${inventoryMovements.deltaQty}), 0)` })
        .from(inventoryMovements)
        .where(eq(inventoryMovements.itemId, line.itemId));

      if (Number(onHand) < qty) {
        throw new FulfilmentError(
          `Not enough ${line.product}: ${Number(onHand)} ${line.unit} on hand, ${qty} needed.`
        );
      }

      await tx.insert(inventoryMovements).values({
        itemId: line.itemId,
        deltaQty: String(-qty),
        reason: 'sale',
        unitCostKobo: line.costPerUnitKobo,
        orderId,
        note: `Order for ${order.customer}`,
        occurredOn: order.occurredOn,
        createdBy: user.id,
      });

      incomeKobo += Math.round(qty * line.unitPriceKobo);
      applied.push({ product: line.product, qty });
    }

    await tx.insert(transactions).values({
      type: 'income',
      category: 'Sales',
      amountKobo: incomeKobo,
      description: `Order — ${order.customer}`,
      occurredOn: order.occurredOn,
      orderId,
      createdBy: user.id,
    });

    await tx
      .update(orders)
      .set({ status: 'delivered', fulfilledAt: new Date() })
      .where(eq(orders.id, orderId));

    await record(tx as never, user, 'order.fulfil', 'orders', orderId, { status: order.status }, {
      status: 'delivered',
      incomeKobo,
    });

    return { orderId, incomeKobo, lines: applied };
  });
}
