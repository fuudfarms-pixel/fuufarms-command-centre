/**
 * Every number the dashboard shows is derived here, from plain data, with no
 * database or React involved — so the accounting can be unit-tested directly.
 *
 * The original tracker computed these inline in the component and got net worth
 * wrong:
 *
 *   netWorth = capital + assets + inventory + profit          // WRONG
 *
 * `capital` was a static figure that never moved when you spent it, so cash used
 * to buy a vehicle was counted twice — once as untouched capital, once as an
 * asset. There was no cash balance at all. The corrected model tracks capital as
 * events that land in cash, and spends out of it:
 *
 *   cash     = Σ capital + Σ income − Σ expense
 *   netWorth = cash + assets + inventoryAtCost
 *
 * Stock bought with cash moves value from `cash` into `inventoryAtCost`, so the
 * total is unchanged by a purchase — which is what makes it a balance sheet
 * rather than a running total of everything that ever happened.
 */
import { percent } from './money';

export type TransactionType = 'income' | 'expense';
export type OrderStatus = 'pending' | 'processing' | 'delivered' | 'cancelled';

export interface CapitalEventRow {
  amountKobo: number;
}

export interface TransactionRow {
  type: TransactionType;
  category: string;
  amountKobo: number;
  occurredOn: string; // ISO date, yyyy-mm-dd
}

export interface InventoryItemRow {
  id: string;
  product: string;
  unit: string;
  costPerUnitKobo: number;
  marketPriceKobo: number;
}

export interface MovementRow {
  itemId: string;
  deltaQty: number;
}

export interface AssetRow {
  valueKobo: number;
  disposedOn: string | null;
}

export interface OrderRow {
  status: OrderStatus;
  lines: { qty: number; unitPriceKobo: number }[];
}

export interface MetricsInput {
  capitalEvents: CapitalEventRow[];
  transactions: TransactionRow[];
  items: InventoryItemRow[];
  movements: MovementRow[];
  assets: AssetRow[];
  orders: OrderRow[];
}

export interface StockLine {
  item: InventoryItemRow;
  qty: number;
  costValueKobo: number;
  marketValueKobo: number;
  gainKobo: number;
  marginPct: number;
}

const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);

/** Current quantity per item id, derived from the movement ledger. */
export function stockByItem(movements: MovementRow[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const m of movements) {
    out.set(m.itemId, (out.get(m.itemId) ?? 0) + m.deltaQty);
  }
  return out;
}

export function stockLines(items: InventoryItemRow[], movements: MovementRow[]): StockLine[] {
  const qtys = stockByItem(movements);

  return items.map((item) => {
    const qty = qtys.get(item.id) ?? 0;
    const costValueKobo = Math.round(qty * item.costPerUnitKobo);
    const marketValueKobo = Math.round(qty * item.marketPriceKobo);
    const gainKobo = marketValueKobo - costValueKobo;

    return {
      item,
      qty,
      costValueKobo,
      marketValueKobo,
      gainKobo,
      // Margin on market value (gross-margin convention), matching the original.
      marginPct: percent(gainKobo, marketValueKobo),
    };
  });
}

export interface Metrics {
  capitalInKobo: number;
  totalIncomeKobo: number;
  totalExpenseKobo: number;
  netProfitKobo: number;
  profitMarginPct: number;
  cashKobo: number;
  assetsKobo: number;
  inventoryAtCostKobo: number;
  inventoryAtMarketKobo: number;
  unrealisedGainKobo: number;
  netWorthKobo: number;
  roiPct: number;
  pendingOrdersKobo: number;
  stock: StockLine[];
}

export function computeMetrics(input: MetricsInput): Metrics {
  const capitalInKobo = sum(input.capitalEvents.map((c) => c.amountKobo));

  const totalIncomeKobo = sum(
    input.transactions.filter((t) => t.type === 'income').map((t) => t.amountKobo)
  );
  const totalExpenseKobo = sum(
    input.transactions.filter((t) => t.type === 'expense').map((t) => t.amountKobo)
  );
  const netProfitKobo = totalIncomeKobo - totalExpenseKobo;

  // Cash actually on hand: equity injected, plus what came in, less what went out.
  const cashKobo = capitalInKobo + totalIncomeKobo - totalExpenseKobo;

  const assetsKobo = sum(
    input.assets.filter((a) => a.disposedOn === null).map((a) => a.valueKobo)
  );

  const stock = stockLines(input.items, input.movements);
  const inventoryAtCostKobo = sum(stock.map((s) => s.costValueKobo));
  const inventoryAtMarketKobo = sum(stock.map((s) => s.marketValueKobo));

  // Stock is held at cost. The market uplift is unrealised — it is not yours until
  // you sell, so it must not inflate net worth.
  const netWorthKobo = cashKobo + assetsKobo + inventoryAtCostKobo;

  const pendingOrdersKobo = sum(
    input.orders
      .filter((o) => o.status === 'pending' || o.status === 'processing')
      .map((o) => sum(o.lines.map((l) => Math.round(l.qty * l.unitPriceKobo))))
  );

  return {
    capitalInKobo,
    totalIncomeKobo,
    totalExpenseKobo,
    netProfitKobo,
    profitMarginPct: percent(netProfitKobo, totalIncomeKobo),
    cashKobo,
    assetsKobo,
    inventoryAtCostKobo,
    inventoryAtMarketKobo,
    unrealisedGainKobo: inventoryAtMarketKobo - inventoryAtCostKobo,
    netWorthKobo,
    roiPct: percent(netProfitKobo, capitalInKobo),
    pendingOrdersKobo,
    stock,
  };
}

export interface MonthPoint {
  month: string; // yyyy-mm
  incomeKobo: number;
  expenseKobo: number;
  profitKobo: number;
}

/** Monthly series for the revenue/expense bars and the profit trend. */
export function monthlySeries(transactions: TransactionRow[]): MonthPoint[] {
  const byMonth = new Map<string, MonthPoint>();

  for (const t of transactions) {
    const month = t.occurredOn.slice(0, 7);
    let point = byMonth.get(month);
    if (!point) {
      point = { month, incomeKobo: 0, expenseKobo: 0, profitKobo: 0 };
      byMonth.set(month, point);
    }
    if (t.type === 'income') point.incomeKobo += t.amountKobo;
    else point.expenseKobo += t.amountKobo;
  }

  return [...byMonth.values()]
    .map((p) => ({ ...p, profitKobo: p.incomeKobo - p.expenseKobo }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export interface CategorySlice {
  name: string;
  valueKobo: number;
}

export function byCategory(
  transactions: TransactionRow[],
  type: TransactionType
): CategorySlice[] {
  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== type) continue;
    totals.set(t.category, (totals.get(t.category) ?? 0) + t.amountKobo);
  }
  return [...totals.entries()]
    .map(([name, valueKobo]) => ({ name, valueKobo }))
    .sort((a, b) => b.valueKobo - a.valueKobo);
}
