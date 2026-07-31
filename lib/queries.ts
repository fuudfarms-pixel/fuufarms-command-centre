import { isNull } from 'drizzle-orm';
import { db } from '@/db';
import {
  assets,
  capitalEvents,
  inventoryItems,
  inventoryMovements,
  orderLines,
  orders,
  transactions,
} from '@/db/schema';
import type { MetricsInput, OrderStatus } from './metrics';

/**
 * Everything computeMetrics() needs, in one round of queries.
 *
 * Deliberately loads rather than aggregating in SQL: the whole point of
 * lib/metrics.ts is that the accounting lives in one tested place, and pushing
 * half of it into SQL would split the rules across two languages. At this
 * business's volume that is the right trade; revisit if the ledger reaches
 * six figures of rows.
 */
export async function loadMetricsInput(): Promise<MetricsInput> {
  const [capitalRows, txRows, itemRows, movementRows, assetRows, orderRows, lineRows] =
    await Promise.all([
      db.select({ amountKobo: capitalEvents.amountKobo }).from(capitalEvents),
      db
        .select({
          type: transactions.type,
          category: transactions.category,
          amountKobo: transactions.amountKobo,
          occurredOn: transactions.occurredOn,
        })
        .from(transactions),
      db
        .select({
          id: inventoryItems.id,
          product: inventoryItems.product,
          unit: inventoryItems.unit,
          costPerUnitKobo: inventoryItems.costPerUnitKobo,
          marketPriceKobo: inventoryItems.marketPriceKobo,
        })
        .from(inventoryItems)
        .where(isNull(inventoryItems.archivedAt)),
      db
        .select({ itemId: inventoryMovements.itemId, deltaQty: inventoryMovements.deltaQty })
        .from(inventoryMovements),
      db
        .select({ valueKobo: assets.valueKobo, disposedOn: assets.disposedOn })
        .from(assets),
      db.select({ id: orders.id, status: orders.status }).from(orders),
      db
        .select({
          orderId: orderLines.orderId,
          qty: orderLines.qty,
          unitPriceKobo: orderLines.unitPriceKobo,
        })
        .from(orderLines),
    ]);

  // `numeric` comes back as a string from postgres — parse at the boundary so the
  // metrics layer only ever sees numbers.
  const linesByOrder = new Map<string, { qty: number; unitPriceKobo: number }[]>();
  for (const line of lineRows) {
    const list = linesByOrder.get(line.orderId) ?? [];
    list.push({ qty: Number(line.qty), unitPriceKobo: line.unitPriceKobo });
    linesByOrder.set(line.orderId, list);
  }

  return {
    capitalEvents: capitalRows,
    transactions: txRows,
    items: itemRows,
    movements: movementRows.map((m) => ({ itemId: m.itemId, deltaQty: Number(m.deltaQty) })),
    assets: assetRows,
    orders: orderRows.map((o) => ({
      status: o.status as OrderStatus,
      lines: linesByOrder.get(o.id) ?? [],
    })),
  };
}
