/**
 * Business schema. Identity is NOT defined here — Neon Auth manages the
 * `neon_auth` schema inside this same database, so user rows are joinable in SQL
 * but owned by the auth service. We only ever store a user id as text.
 *
 * All money columns are `bigint` kobo (see lib/money.ts). All quantities are
 * `numeric` because stock is sold in fractional litres and kilos.
 */
import {
  pgTable,
  text,
  bigint,
  numeric,
  timestamp,
  date,
  uuid,
  index,
  pgEnum,
  jsonb,
} from 'drizzle-orm/pg-core';

export const transactionTypeEnum = pgEnum('transaction_type', ['income', 'expense']);

export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'processing',
  'delivered',
  'cancelled',
]);

export const movementReasonEnum = pgEnum('movement_reason', [
  'purchase',
  'sale',
  'adjustment',
  'spoilage',
]);

export const assetCategoryEnum = pgEnum('asset_category', [
  'equipment',
  'vehicle',
  'land',
  'technology',
  'other',
]);

/**
 * Equity in and out. Replaces the tracker's single static `capital: 7500000`,
 * which never decreased when spent and so double-counted against assets and
 * stock bought with it.
 */
export const capitalEvents = pgTable('capital_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  amountKobo: bigint('amount_kobo', { mode: 'number' }).notNull(), // negative = withdrawal
  note: text('note').notNull().default(''),
  occurredOn: date('occurred_on').notNull(),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const inventoryItems = pgTable('inventory_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  product: text('product').notNull(),
  unit: text('unit').notNull().default('Litre'),
  supplier: text('supplier').notNull().default(''),
  costPerUnitKobo: bigint('cost_per_unit_kobo', { mode: 'number' }).notNull(),
  marketPriceKobo: bigint('market_price_kobo', { mode: 'number' }).notNull(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Stock level is DERIVED from these rows (sum of delta_qty), never stored as a
 * mutable column. That gives an audit trail — you can always answer "why is there
 * 340 litres and not 500" — and makes concurrent writes safe.
 */
export const inventoryMovements = pgTable(
  'inventory_movements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    itemId: uuid('item_id')
      .notNull()
      .references(() => inventoryItems.id, { onDelete: 'cascade' }),
    deltaQty: numeric('delta_qty', { precision: 14, scale: 3 }).notNull(), // negative = out
    reason: movementReasonEnum('reason').notNull(),
    unitCostKobo: bigint('unit_cost_kobo', { mode: 'number' }),
    orderId: uuid('order_id'),
    note: text('note').notNull().default(''),
    occurredOn: date('occurred_on').notNull(),
    createdBy: text('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('movements_item_idx').on(t.itemId), index('movements_order_idx').on(t.orderId)]
);

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customer: text('customer').notNull(),
    status: orderStatusEnum('status').notNull().default('pending'),
    occurredOn: date('occurred_on').notNull(),
    /** Set when the order is first marked delivered, so fulfilment is idempotent. */
    fulfilledAt: timestamp('fulfilled_at', { withTimezone: true }),
    note: text('note').notNull().default(''),
    createdBy: text('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('orders_status_idx').on(t.status)]
);

export const orderLines = pgTable(
  'order_lines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    itemId: uuid('item_id')
      .notNull()
      .references(() => inventoryItems.id, { onDelete: 'restrict' }),
    qty: numeric('qty', { precision: 14, scale: 3 }).notNull(),
    unitPriceKobo: bigint('unit_price_kobo', { mode: 'number' }).notNull(),
  },
  (t) => [index('order_lines_order_idx').on(t.orderId)]
);

export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: transactionTypeEnum('type').notNull(),
    category: text('category').notNull(),
    amountKobo: bigint('amount_kobo', { mode: 'number' }).notNull(), // always positive
    description: text('description').notNull().default(''),
    occurredOn: date('occurred_on').notNull(),
    /** Set when this row was posted automatically by fulfilling an order. */
    orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),
    createdBy: text('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('transactions_date_idx').on(t.occurredOn), index('transactions_type_idx').on(t.type)]
);

export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  category: assetCategoryEnum('category').notNull().default('equipment'),
  valueKobo: bigint('value_kobo', { mode: 'number' }).notNull(),
  acquiredOn: date('acquired_on').notNull(),
  disposedOn: date('disposed_on'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Who changed what. Matters the moment more than one person can touch the books. */
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorId: text('actor_id').notNull(),
    actorEmail: text('actor_email').notNull().default(''),
    action: text('action').notNull(), // e.g. 'transaction.create'
    entity: text('entity').notNull(),
    entityId: text('entity_id'),
    before: jsonb('before'),
    after: jsonb('after'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('audit_actor_idx').on(t.actorId), index('audit_created_idx').on(t.createdAt)]
);
