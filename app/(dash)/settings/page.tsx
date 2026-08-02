import { desc } from 'drizzle-orm';
import { db } from '@/db';
import { capitalEvents } from '@/db/schema';
import { requireMember } from '@/lib/auth/guard';
import { canDelete } from '@/lib/auth/roles';
import { formatKobo } from '@/lib/money';
import { NewCapitalEvent } from './NewCapitalEvent';
import { DeleteCapitalEvent } from './DeleteCapitalEvent';
import styles from '../page.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Capital — Command Centre' };

export default async function SettingsPage() {
  const user = await requireMember();
  const rows = await db
    .select()
    .from(capitalEvents)
    .orderBy(desc(capitalEvents.occurredOn), desc(capitalEvents.createdAt));

  const total = rows.reduce((s, r) => s + r.amountKobo, 0);

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Capital</h1>
          <p className={styles.lede}>
            Equity in and out. Recorded as events so the history survives — and so spending
            it actually reduces cash.
          </p>
        </div>
      </header>

      <section className={styles.summary}>
        <div className={`${styles.stat} ${styles.brand}`}>
          <span className={styles.statLabel}>Net capital in</span>
          <span className={`${styles.statValue} num`}>{formatKobo(total)}</span>
        </div>
      </section>

      {canDelete(user.roles) ? (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Record Capital.</h2>
          <NewCapitalEvent />
        </section>
      ) : (
        <section className={styles.panel}>
          <p className={styles.empty}>Only an admin can record capital movements.</p>
        </section>
      )}

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>History.</h2>
        {rows.length === 0 ? (
          <p className={styles.empty}>No capital recorded yet.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Direction</th>
                  <th>Amount</th>
                  <th>Note</th>
                  {canDelete(user.roles) && <th />}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="num">{r.occurredOn}</td>
                    <td>
                      <span
                        className={`${styles.pill} ${
                          r.amountKobo >= 0 ? styles.pillIn : styles.pillOut
                        }`}
                      >
                        {r.amountKobo >= 0 ? 'In' : 'Out'}
                      </span>
                    </td>
                    <td className={`num ${r.amountKobo >= 0 ? 'pos' : 'neg'}`}>
                      {formatKobo(r.amountKobo)}
                    </td>
                    <td style={{ whiteSpace: 'normal' }}>{r.note || '—'}</td>
                    {canDelete(user.roles) && (
                      <td>
                        <DeleteCapitalEvent id={r.id} />
                      </td>
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
