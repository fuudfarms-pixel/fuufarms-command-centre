import { desc } from 'drizzle-orm';
import { db } from '@/db';
import { transactions } from '@/db/schema';
import { requireMember } from '@/lib/auth/guard';
import { canDelete } from '@/lib/auth/roles';
import { formatKobo } from '@/lib/money';
import { NewTransaction } from './NewTransaction';
import { DeleteTransaction } from './DeleteTransaction';
import styles from '../page.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Transactions — Command Centre' };

export default async function TransactionsPage() {
  const user = await requireMember();
  const rows = await db
    .select()
    .from(transactions)
    .orderBy(desc(transactions.occurredOn), desc(transactions.createdAt))
    .limit(300);

  const income = rows.filter((r) => r.type === 'income').reduce((s, r) => s + r.amountKobo, 0);
  const expense = rows.filter((r) => r.type === 'expense').reduce((s, r) => s + r.amountKobo, 0);

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Transactions</h1>
          <p className={styles.lede}>Every naira in and out. Most recent first.</p>
        </div>
      </header>

      <section className={styles.summary}>
        <div className={`${styles.stat} ${styles.brand}`}>
          <span className={styles.statLabel}>Income</span>
          <span className={`${styles.statValue} num pos`}>{formatKobo(income)}</span>
        </div>
        <div className={`${styles.stat} ${styles.neg}`}>
          <span className={styles.statLabel}>Expenses</span>
          <span className={`${styles.statValue} num neg`}>{formatKobo(expense)}</span>
        </div>
        <div className={`${styles.stat} ${styles.accent}`}>
          <span className={styles.statLabel}>Net</span>
          <span className={`${styles.statValue} num ${income - expense >= 0 ? 'pos' : 'neg'}`}>
            {formatKobo(income - expense)}
          </span>
        </div>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Record a Transaction.</h2>
        <NewTransaction />
      </section>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Ledger.</h2>
        {rows.length === 0 ? (
          <p className={styles.empty}>Nothing recorded yet.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Amount</th>
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
                          r.type === 'income' ? styles.pillIn : styles.pillOut
                        }`}
                      >
                        {r.type === 'income' ? 'Income' : 'Expense'}
                      </span>
                    </td>
                    <td>{r.category}</td>
                    <td style={{ whiteSpace: 'normal' }}>
                      {r.description}
                      {r.orderId && (
                        <span className={styles.lede}> · from a delivered order</span>
                      )}
                    </td>
                    <td className={`num ${r.type === 'income' ? 'pos' : 'neg'}`}>
                      {r.type === 'income' ? '+' : '−'}
                      {formatKobo(r.amountKobo)}
                    </td>
                    {canDelete(user.roles) && (
                      <td>{!r.orderId && <DeleteTransaction id={r.id} />}</td>
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
