import { desc, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { inventoryItems, orderLines, orders } from '@/db/schema';
import { requireUser } from '@/lib/auth/guard';
import { formatKobo } from '@/lib/money';
import { NewOrder } from './NewOrder';
import { OrderActions } from './OrderActions';
import styles from '../page.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Orders — Command Centre' };

const PILL: Record<string, string> = {
  pending: styles.pillPending,
  processing: styles.pillPending,
  delivered: styles.pillDone,
  cancelled: styles.pillDead,
};

export default async function OrdersPage() {
  await requireUser();

  const [rows, items] = await Promise.all([
    db
      .select({
        id: orders.id,
        customer: orders.customer,
        status: orders.status,
        occurredOn: orders.occurredOn,
        fulfilledAt: orders.fulfilledAt,
        qty: orderLines.qty,
        unitPriceKobo: orderLines.unitPriceKobo,
        product: inventoryItems.product,
        unit: inventoryItems.unit,
      })
      .from(orders)
      .leftJoin(orderLines, eq(orderLines.orderId, orders.id))
      .leftJoin(inventoryItems, eq(orderLines.itemId, inventoryItems.id))
      .orderBy(desc(orders.occurredOn), desc(orders.createdAt))
      .limit(200),
    db.select().from(inventoryItems).where(isNull(inventoryItems.archivedAt)),
  ]);

  const value = (r: (typeof rows)[number]) =>
    r.qty && r.unitPriceKobo ? Math.round(Number(r.qty) * r.unitPriceKobo) : 0;

  const open = rows.filter((r) => r.status === 'pending' || r.status === 'processing');

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Orders</h1>
          <p className={styles.lede}>
            Delivering an order decrements stock and posts the income in one step.
          </p>
        </div>
      </header>

      <section className={styles.summary}>
        <div className={`${styles.stat} ${styles.accent}`}>
          <span className={styles.statLabel}>Open orders</span>
          <span className={`${styles.statValue} num`}>{open.length}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Expected income</span>
          <span className={`${styles.statValue} num`}>
            {formatKobo(open.reduce((s, r) => s + value(r), 0))}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Delivered</span>
          <span className={`${styles.statValue} num`}>
            {rows.filter((r) => r.status === 'delivered').length}
          </span>
        </div>
      </section>

      {items.length === 0 ? (
        <section className={styles.panel}>
          <p className={styles.empty}>Add a product under Inventory before creating orders.</p>
        </section>
      ) : (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>New order</h2>
          <NewOrder
            items={items.map((i) => ({ value: i.id, label: `${i.product} (${i.unit})` }))}
          />
        </section>
      )}

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>All orders</h2>
        {rows.length === 0 ? (
          <p className={styles.empty}>No orders yet.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Unit price</th>
                  <th>Value</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="num">{r.occurredOn}</td>
                    <td>{r.customer}</td>
                    <td>{r.product ?? '—'}</td>
                    <td className="num">
                      {r.qty ? `${Number(r.qty)} ${r.unit ?? ''}` : '—'}
                    </td>
                    <td className="num">{r.unitPriceKobo ? formatKobo(r.unitPriceKobo) : '—'}</td>
                    <td className="num">{formatKobo(value(r))}</td>
                    <td>
                      <span className={`${styles.pill} ${PILL[r.status]}`}>{r.status}</span>
                    </td>
                    <td>
                      {!r.fulfilledAt && r.status !== 'cancelled' && (
                        <OrderActions id={r.id} customer={r.customer} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
