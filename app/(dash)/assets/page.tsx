import { desc } from 'drizzle-orm';
import { db } from '@/db';
import { assets } from '@/db/schema';
import { requireUser } from '@/lib/auth/guard';
import { canDelete } from '@/lib/auth/roles';
import { formatKobo } from '@/lib/money';
import { NewAsset } from './NewAsset';
import { DisposeAsset } from './DisposeAsset';
import styles from '../page.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Assets — Command Centre' };

export default async function AssetsPage() {
  const user = await requireUser();
  const rows = await db.select().from(assets).orderBy(desc(assets.acquiredOn));

  const held = rows.filter((r) => r.disposedOn === null);
  const total = held.reduce((s, r) => s + r.valueKobo, 0);

  const byCategory = new Map<string, number>();
  for (const r of held) byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + r.valueKobo);

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Assets</h1>
          <p className={styles.lede}>Equipment, vehicles and land the business holds.</p>
        </div>
      </header>

      <section className={styles.summary}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Total held</span>
          <span className={`${styles.statValue} num`}>{formatKobo(total)}</span>
        </div>
        {[...byCategory.entries()].map(([cat, value]) => (
          <div key={cat} className={`${styles.stat} ${styles.accent}`}>
            <span className={styles.statLabel}>{cat}</span>
            <span className={`${styles.statValue} num`}>{formatKobo(value)}</span>
          </div>
        ))}
      </section>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Register an asset</h2>
        <NewAsset />
      </section>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Register</h2>
        {rows.length === 0 ? (
          <p className={styles.empty}>Nothing registered yet.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Category</th>
                  <th>Value</th>
                  <th>Acquired</th>
                  <th>Status</th>
                  {canDelete(user.roles) && <th />}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>
                      <span className={`${styles.pill} ${styles.pillDead}`}>{r.category}</span>
                    </td>
                    <td className="num">{formatKobo(r.valueKobo)}</td>
                    <td className="num">{r.acquiredOn}</td>
                    <td>
                      {r.disposedOn ? (
                        <span className={`${styles.pill} ${styles.pillDead}`}>
                          disposed {r.disposedOn}
                        </span>
                      ) : (
                        <span className={`${styles.pill} ${styles.pillDone}`}>held</span>
                      )}
                    </td>
                    {canDelete(user.roles) && (
                      <td>{!r.disposedOn && <DisposeAsset id={r.id} name={r.name} />}</td>
                    )}
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
