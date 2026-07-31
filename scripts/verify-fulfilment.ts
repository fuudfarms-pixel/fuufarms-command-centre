/**
 * Integration check for the order → stock → income path, run against a real
 * database. The accounting unit tests cover the arithmetic; this covers the
 * things only Postgres can tell us: that the transaction is atomic, that the
 * row lock makes double fulfilment impossible, and that a failure rolls back.
 *
 *   npm run verify:fulfilment      (uses DATABASE_URL from .env.local)
 *
 * Creates its own fixtures and removes them, so it is safe to re-run. Point it
 * at dev, never prod.
 */
import { loadEnv } from './env';
loadEnv();

import { eq, sql, inArray } from 'drizzle-orm';
import { db } from '../db';
import { inventoryItems, inventoryMovements, orderLines, orders, transactions, auditLog } from '../db/schema';
import { fulfilOrder, FulfilmentError } from '../lib/fulfil';
import type { CurrentUser } from '../lib/auth/guard';

const actor: CurrentUser = {
  id: 'verify-script',
  email: 'verify@local',
  name: 'Verify Script',
  roles: ['admin'],
  banned: false,
};

const TAG = `verify-${Date.now()}`;
const today = new Date().toISOString().slice(0, 10);

let passed = 0;
let failed = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `  (got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)})`}`);
  ok ? passed++ : failed++;
}

async function onHand(itemId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<string>`coalesce(sum(${inventoryMovements.deltaQty}), 0)` })
    .from(inventoryMovements)
    .where(eq(inventoryMovements.itemId, itemId));
  return Number(row.n);
}

async function main() {
  console.log(`\nfixtures tagged ${TAG}\n`);

  // ── setup: one product, 500 litres bought in ──────────────────────────────
  const [item] = await db
    .insert(inventoryItems)
    .values({
      product: `${TAG} Palm Oil`,
      unit: 'Litre',
      supplier: 'Verify Mills',
      costPerUnitKobo: 120_000, // ₦1,200
      marketPriceKobo: 160_000, // ₦1,600
    })
    .returning();

  await db.insert(inventoryMovements).values({
    itemId: item.id,
    deltaQty: '500',
    reason: 'purchase',
    unitCostKobo: 120_000,
    occurredOn: today,
    createdBy: actor.id,
    note: TAG,
  });

  console.log('happy path');
  const [order] = await db
    .insert(orders)
    .values({ customer: `${TAG} Mama Cee`, status: 'pending', occurredOn: today, createdBy: actor.id })
    .returning();
  await db.insert(orderLines).values({
    orderId: order.id,
    itemId: item.id,
    qty: '160',
    unitPriceKobo: 160_000,
  });

  check('stock before', await onHand(item.id), 500);

  const result = await fulfilOrder(actor, order.id);
  check('income posted', result.incomeKobo, 160 * 160_000); // ₦25,600,000 kobo
  check('stock after', await onHand(item.id), 340);

  const [after] = await db.select().from(orders).where(eq(orders.id, order.id));
  check('status', after.status, 'delivered');
  check('fulfilledAt set', after.fulfilledAt !== null, true);

  const income = await db.select().from(transactions).where(eq(transactions.orderId, order.id));
  check('exactly one income row', income.length, 1);
  check('income amount', income[0].amountKobo, 25_600_000);

  console.log('\nidempotency');
  try {
    await fulfilOrder(actor, order.id);
    check('second fulfilment rejected', 'no error thrown', 'FulfilmentError');
  } catch (e) {
    check('second fulfilment rejected', e instanceof FulfilmentError, true);
  }
  check('stock unchanged after retry', await onHand(item.id), 340);
  check(
    'still exactly one income row',
    (await db.select().from(transactions).where(eq(transactions.orderId, order.id))).length,
    1
  );

  console.log('\ninsufficient stock rolls back');
  const [big] = await db
    .insert(orders)
    .values({ customer: `${TAG} Too Big`, status: 'pending', occurredOn: today, createdBy: actor.id })
    .returning();
  await db.insert(orderLines).values({
    orderId: big.id,
    itemId: item.id,
    qty: '9999',
    unitPriceKobo: 160_000,
  });

  try {
    await fulfilOrder(actor, big.id);
    check('oversized order rejected', 'no error thrown', 'FulfilmentError');
  } catch (e) {
    check('oversized order rejected', e instanceof FulfilmentError, true);
  }
  check('stock untouched by failed fulfilment', await onHand(item.id), 340);
  const [bigAfter] = await db.select().from(orders).where(eq(orders.id, big.id));
  check('failed order still pending', bigAfter.status, 'pending');
  check(
    'no income row for failed order',
    (await db.select().from(transactions).where(eq(transactions.orderId, big.id))).length,
    0
  );

  console.log('\nmulti-line order writes one movement per line');
  const [item2] = await db
    .insert(inventoryItems)
    .values({
      product: `${TAG} Honey`,
      unit: 'Litre',
      supplier: 'Verify Apiary',
      costPerUnitKobo: 100_000,
      marketPriceKobo: 150_000,
    })
    .returning();
  await db.insert(inventoryMovements).values({
    itemId: item2.id,
    deltaQty: '80',
    reason: 'purchase',
    occurredOn: today,
    createdBy: actor.id,
    note: TAG,
  });

  const [multi] = await db
    .insert(orders)
    .values({ customer: `${TAG} Lekki Grocers`, status: 'pending', occurredOn: today, createdBy: actor.id })
    .returning();
  await db.insert(orderLines).values([
    { orderId: multi.id, itemId: item.id, qty: '40', unitPriceKobo: 160_000 },
    { orderId: multi.id, itemId: item2.id, qty: '20', unitPriceKobo: 150_000 },
  ]);

  const multiResult = await fulfilOrder(actor, multi.id);
  check('combined income', multiResult.incomeKobo, 40 * 160_000 + 20 * 150_000);
  check('item 1 stock', await onHand(item.id), 300);
  check('item 2 stock', await onHand(item2.id), 60);

  console.log('\naudit trail');
  const audits = await db.select().from(auditLog).where(eq(auditLog.actorId, actor.id));
  check('one audit row per successful fulfilment', audits.length, 2);

  // ── teardown ──────────────────────────────────────────────────────────────
  const itemIds = [item.id, item2.id];
  const orderIds = [order.id, big.id, multi.id];
  await db.delete(auditLog).where(eq(auditLog.actorId, actor.id));
  await db.delete(transactions).where(inArray(transactions.orderId, orderIds));
  await db.delete(inventoryMovements).where(inArray(inventoryMovements.itemId, itemIds));
  await db.delete(orderLines).where(inArray(orderLines.orderId, orderIds));
  await db.delete(orders).where(inArray(orders.id, orderIds));
  await db.delete(inventoryItems).where(inArray(inventoryItems.id, itemIds));
  console.log('\nfixtures removed');

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('\nverification aborted:', e);
  process.exit(1);
});
