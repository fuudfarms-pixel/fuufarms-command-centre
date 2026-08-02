import { isNull, desc } from 'drizzle-orm';
import { db } from '@/db';
import { inventoryItems, inventoryMovements } from '@/db/schema';
import { requireMember } from '@/lib/auth/guard';
import { canDelete } from '@/lib/auth/roles';
import { stockLines } from '@/lib/metrics';
import { formatKobo } from '@/lib/money';
import { InventoryForms } from './InventoryForms';
import { ArchiveItem } from './ArchiveItem';
import styles from '../page.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Inventory — Command Centre' };

export default async function InventoryPage() {
  const user = await requireMember();

  const [items, movements, recent] = await Promise.all([
    db.select().from(inventoryItems).where(isNull(inventoryItems.archivedAt)),
    db
      .select({ itemId: inventoryMovements.itemId, deltaQty: inventoryMovements.deltaQty })
      .from(inventoryMovements),
    db
      .select({
        id: inventoryMovements.id,
        itemId: inventoryMovements.itemId,
        deltaQty: inventoryMovements.deltaQty,
        reason: inventoryMovements.reason,
        note: inventoryMovements.note,
        occurredOn: inventoryMovements.occurredOn,
      })
      .from(inventoryMovements)
      .orderBy(desc(inventoryMovements.createdAt))
      .limit(40),
  ]);

  const lines = stockLines(
    items.map((i) => ({
      id: i.id,
      product: i.product,
      unit: i.unit,
      costPerUnitKobo: i.costPerUnitKobo,
      marketPriceKobo: i.marketPriceKobo,
    })),
    movements.map((m) => ({ itemId: m.itemId, deltaQty: Number(m.deltaQty) }))
  );

  const names = new Map(items.map((i) => [i.id, `${i.product} (${i.unit})`]));
  const atCost = lines.reduce((s, l) => s + l.costValueKobo, 0);
  const atMarket = lines.reduce((s, l) => s + l.marketValueKobo, 0);

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Inventory</h1>
          <p className={styles.lede}>
            Stock is the sum of every movement, so the history always explains the number.
          </p>
        </div>
      </header>

      <section className={styles.summary}>
        <div className={`${styles.stat} ${styles.brand}`}>
          <span className={styles.statLabel}>At cost</span>
          <span className={`${styles.statValue} num`}>{formatKobo(atCost)}</span>
        </div>
        <div className={`${styles.stat} ${styles.brand}`}>
          <span className={styles.statLabel}>At market</span>
          <span className={`${styles.statValue} num`}>{formatKobo(atMarket)}</span>
        </div>
        <div className={`${styles.stat} ${styles.accent}`}>
          <span className={styles.statLabel}>Unrealised gain</span>
          <span className={`${styles.statValue} num ${atMarket - atCost >= 0 ? 'pos' : 'neg'}`}>
            {formatKobo(atMarket - atCost)}
          </span>
        </div>
      </section>

      <InventoryForms
        items={items.map((i) => ({ id: i.id, label: `${i.product} (${i.unit})` }))}
        canAdjust={canDelete(user.roles)}
      />

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Stock on Hand.</h2>
        {lines.length === 0 ? (
          <p className={styles.empty}>No products yet. Add one above.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Supplier</th>
                  <th>On hand</th>
                  <th>Cost/unit</th>
                  <th>Market</th>
                  <th>At cost</th>
                  <th>At market</th>
                  <th>Gain</th>
                  <th>Margin</th>
                  {canDelete(user.roles) && <th />}
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => {
                  const item = items.find((i) => i.id === l.item.id)!;
                  return (
                    <tr key={l.item.id}>
                      <td>{l.item.product}</td>
                      <td className={styles.lede}>{item.supplier || '—'}</td>
                      <td className={`num ${l.qty <= 0 ? 'neg' : ''}`}>
                        {l.qty} {l.item.unit}
                      </td>
                      <td className="num">{formatKobo(l.item.costPerUnitKobo)}</td>
                      <td className="num">{formatKobo(l.item.marketPriceKobo)}</td>
                      <td className="num">{formatKobo(l.costValueKobo)}</td>
                      <td className="num">{formatKobo(l.marketValueKobo)}</td>
                      <td className={`num ${l.gainKobo >= 0 ? 'pos' : 'neg'}`}>
                        {formatKobo(l.gainKobo)}
                      </td>
                      <td className="num">{l.marginPct}%</td>
                      {canDelete(user.roles) && (
                        <td>
                          <ArchiveItem id={l.item.id} product={l.item.product} />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Recent Movements.</h2>
        {recent.length === 0 ? (
          <p className={styles.empty}>No movements yet.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Change</th>
                  <th>Reason</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((m) => (
                  <tr key={m.id}>
                    <td className="num">{m.occurredOn}</td>
                    <td>{names.get(m.itemId) ?? '—'}</td>
                    <td className={`num ${Number(m.deltaQty) >= 0 ? 'pos' : 'neg'}`}>
                      {Number(m.deltaQty) >= 0 ? '+' : ''}
                      {Number(m.deltaQty)}
                    </td>
                    <td>
                      <span className={`${styles.pill} ${styles.pillDead}`}>{m.reason}</span>
                    </td>
                    <td style={{ whiteSpace: 'normal' }} className={styles.lede}>
                      {m.note || '—'}
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
