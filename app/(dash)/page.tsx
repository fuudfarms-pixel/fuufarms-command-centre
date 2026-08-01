import { requireMember } from '@/lib/auth/guard';
import { loadMetricsInput } from '@/lib/queries';
import { computeMetrics } from '@/lib/metrics';
import { formatKoboShort, formatKobo } from '@/lib/money';
import styles from './dashboard.module.css';

// Reads the ledger on every request; nothing here is safe to cache.
export const dynamic = 'force-dynamic';

function Kpi({
  label,
  value,
  sub,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'neutral' | 'pos' | 'neg' | 'accent';
}) {
  return (
    <div className={`${styles.kpi} ${styles[tone]}`}>
      <span className={styles.kpiLabel}>{label}</span>
      <span className={`${styles.kpiValue} num`}>{value}</span>
      {sub && <span className={styles.kpiSub}>{sub}</span>}
    </div>
  );
}

export default async function DashboardPage() {
  const user = await requireMember();
  const metrics = computeMetrics(await loadMetricsInput());

  const signed = (kobo: number): 'pos' | 'neg' => (kobo >= 0 ? 'pos' : 'neg');

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.lede}>Signed in as {user.name}</p>
        </div>
        <div className={styles.netWorth}>
          <span className={styles.kpiLabel}>Net worth</span>
          <strong className="num">{formatKoboShort(metrics.netWorthKobo)}</strong>
        </div>
      </header>

      <section className={styles.grid}>
        <Kpi
          label="Cash on hand"
          value={formatKoboShort(metrics.cashKobo)}
          sub="Capital + income − expenses"
          tone={signed(metrics.cashKobo)}
        />
        <Kpi
          label="Net worth"
          value={formatKoboShort(metrics.netWorthKobo)}
          sub="Cash + assets + stock at cost"
        />
        <Kpi label="Capital in" value={formatKoboShort(metrics.capitalInKobo)} sub="Equity injected" />
        <Kpi label="Revenue" value={formatKoboShort(metrics.totalIncomeKobo)} sub="All income recorded" />
        <Kpi
          label="Expenses"
          value={formatKoboShort(metrics.totalExpenseKobo)}
          sub="All costs recorded"
          tone="neg"
        />
        <Kpi
          label="Net profit"
          value={formatKoboShort(metrics.netProfitKobo)}
          sub={`Margin ${metrics.profitMarginPct}%`}
          tone={signed(metrics.netProfitKobo)}
        />
        <Kpi label="ROI" value={`${metrics.roiPct}%`} sub="Profit on capital" tone="accent" />
        <Kpi label="Assets" value={formatKoboShort(metrics.assetsKobo)} sub="Held, not disposed" />
        <Kpi
          label="Stock at cost"
          value={formatKoboShort(metrics.inventoryAtCostKobo)}
          sub="What it cost you"
        />
        <Kpi
          label="Stock at market"
          value={formatKoboShort(metrics.inventoryAtMarketKobo)}
          sub="What it would fetch"
        />
        <Kpi
          label="Unrealised gain"
          value={formatKoboShort(metrics.unrealisedGainKobo)}
          sub="Not yours until sold"
          tone={signed(metrics.unrealisedGainKobo)}
        />
        <Kpi
          label="Open orders"
          value={formatKoboShort(metrics.pendingOrdersKobo)}
          sub="Expected income"
          tone="accent"
        />
      </section>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Stock margin</h2>
        {metrics.stock.length === 0 ? (
          <p className={styles.empty}>No stock recorded yet.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Cost/unit</th>
                  <th>Market</th>
                  <th>At cost</th>
                  <th>At market</th>
                  <th>Gain</th>
                  <th>Margin</th>
                </tr>
              </thead>
              <tbody>
                {metrics.stock.map((line) => (
                  <tr key={line.item.id}>
                    <td>{line.item.product}</td>
                    <td className="num">
                      {line.qty} {line.item.unit}
                    </td>
                    <td className="num">{formatKobo(line.item.costPerUnitKobo)}</td>
                    <td className="num">{formatKobo(line.item.marketPriceKobo)}</td>
                    <td className="num">{formatKobo(line.costValueKobo)}</td>
                    <td className="num">{formatKobo(line.marketValueKobo)}</td>
                    <td className={`num ${line.gainKobo >= 0 ? 'pos' : 'neg'}`}>
                      {formatKobo(line.gainKobo)}
                    </td>
                    <td className="num">{line.marginPct}%</td>
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
