import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { computeMetrics, stockByItem, monthlySeries, byCategory, type MetricsInput } from './metrics';
import { nairaToKobo, formatKoboShort, percent } from './money';

const n = (naira: number) => naira * 100; // naira -> kobo

const empty: MetricsInput = {
  capitalEvents: [],
  transactions: [],
  items: [],
  movements: [],
  assets: [],
  orders: [],
};

describe('cash and net worth', () => {
  test('cash is capital plus income less expense', () => {
    const m = computeMetrics({
      ...empty,
      capitalEvents: [{ amountKobo: n(7_500_000) }],
      transactions: [
        { type: 'income', category: 'Sales', amountKobo: n(320_000), occurredOn: '2026-07-01' },
        { type: 'expense', category: 'Logistics', amountKobo: n(35_000), occurredOn: '2026-07-02' },
      ],
    });

    assert.equal(m.cashKobo, n(7_785_000));
    assert.equal(m.netProfitKobo, n(285_000));
  });

  /**
   * The bug this project exists to fix. Spending cash on stock moves value between
   * two columns of the balance sheet; it must not change the total. The original
   * added a static `capital` to assets and inventory bought with that same
   * capital, so a purchase inflated net worth.
   */
  test('buying stock with cash leaves net worth unchanged', () => {
    const before = computeMetrics({
      ...empty,
      capitalEvents: [{ amountKobo: n(1_000_000) }],
    });

    const after = computeMetrics({
      ...empty,
      capitalEvents: [{ amountKobo: n(1_000_000) }],
      transactions: [
        // ₦600,000 leaves the bank...
        { type: 'expense', category: 'Procurement', amountKobo: n(600_000), occurredOn: '2026-07-01' },
      ],
      items: [{ id: 'a', product: 'Palm Oil', unit: 'Litre', costPerUnitKobo: n(1_200), marketPriceKobo: n(1_600) }],
      // ...and comes back as 500 litres at ₦1,200 = ₦600,000 of stock.
      movements: [{ itemId: 'a', deltaQty: 500 }],
    });

    assert.equal(before.netWorthKobo, n(1_000_000));
    assert.equal(after.netWorthKobo, n(1_000_000), 'a purchase must be net-worth neutral');
    assert.equal(after.cashKobo, n(400_000));
    assert.equal(after.inventoryAtCostKobo, n(600_000));
  });

  test('buying an asset with cash leaves net worth unchanged', () => {
    const m = computeMetrics({
      ...empty,
      capitalEvents: [{ amountKobo: n(1_000_000) }],
      transactions: [
        { type: 'expense', category: 'Equipment', amountKobo: n(800_000), occurredOn: '2026-07-01' },
      ],
      assets: [{ valueKobo: n(800_000), disposedOn: null }],
    });

    assert.equal(m.netWorthKobo, n(1_000_000));
    assert.equal(m.cashKobo, n(200_000));
  });

  test('net worth holds stock at cost, not market — the uplift is unrealised', () => {
    const m = computeMetrics({
      ...empty,
      capitalEvents: [{ amountKobo: n(600_000) }],
      transactions: [
        { type: 'expense', category: 'Procurement', amountKobo: n(600_000), occurredOn: '2026-07-01' },
      ],
      items: [{ id: 'a', product: 'Palm Oil', unit: 'Litre', costPerUnitKobo: n(1_200), marketPriceKobo: n(1_600) }],
      movements: [{ itemId: 'a', deltaQty: 500 }],
    });

    assert.equal(m.inventoryAtCostKobo, n(600_000));
    assert.equal(m.inventoryAtMarketKobo, n(800_000));
    assert.equal(m.unrealisedGainKobo, n(200_000));
    assert.equal(m.netWorthKobo, n(600_000), 'unrealised gain must not inflate net worth');
  });

  test('disposed assets drop out of the balance sheet', () => {
    const m = computeMetrics({
      ...empty,
      assets: [
        { valueKobo: n(800_000), disposedOn: null },
        { valueKobo: n(250_000), disposedOn: '2026-06-30' },
      ],
    });
    assert.equal(m.assetsKobo, n(800_000));
  });
});

describe('stock ledger', () => {
  test('quantity is the sum of movements', () => {
    const qtys = stockByItem([
      { itemId: 'a', deltaQty: 500 },
      { itemId: 'a', deltaQty: -160 },
      { itemId: 'b', deltaQty: 200 },
    ]);
    assert.equal(qtys.get('a'), 340);
    assert.equal(qtys.get('b'), 200);
  });

  test('selling stock reduces inventory and margin is computed on market value', () => {
    const m = computeMetrics({
      ...empty,
      items: [{ id: 'a', product: 'Palm Oil', unit: 'Litre', costPerUnitKobo: n(1_200), marketPriceKobo: n(1_600) }],
      movements: [
        { itemId: 'a', deltaQty: 500 },
        { itemId: 'a', deltaQty: -160 },
      ],
    });

    const line = m.stock[0];
    assert.equal(line.qty, 340);
    assert.equal(line.costValueKobo, n(408_000));
    assert.equal(line.marketValueKobo, n(544_000));
    assert.equal(line.gainKobo, n(136_000));
    assert.equal(line.marginPct, 25); // 136k / 544k
  });

  test('an item with no movements reads as zero, not undefined', () => {
    const m = computeMetrics({
      ...empty,
      items: [{ id: 'a', product: 'Honey', unit: 'Litre', costPerUnitKobo: n(1_000), marketPriceKobo: n(1_500) }],
    });
    assert.equal(m.stock[0].qty, 0);
    assert.equal(m.stock[0].marginPct, 0, 'margin on zero stock must not be NaN');
  });
});

describe('orders', () => {
  test('only unfulfilled orders count as expected income', () => {
    const m = computeMetrics({
      ...empty,
      orders: [
        { status: 'pending', lines: [{ qty: 100, unitPriceKobo: n(1_600) }] },
        { status: 'processing', lines: [{ qty: 50, unitPriceKobo: n(2_400) }] },
        { status: 'delivered', lines: [{ qty: 999, unitPriceKobo: n(9_999) }] },
        { status: 'cancelled', lines: [{ qty: 999, unitPriceKobo: n(9_999) }] },
      ],
    });
    // 160,000 + 120,000 — delivered is already in the ledger, cancelled never happens.
    assert.equal(m.pendingOrdersKobo, n(280_000));
  });
});

describe('derived series', () => {
  test('monthly series groups and sorts, and profit is income less expense', () => {
    const series = monthlySeries([
      { type: 'income', category: 'Sales', amountKobo: n(300), occurredOn: '2026-07-15' },
      { type: 'expense', category: 'Fuel', amountKobo: n(100), occurredOn: '2026-07-20' },
      { type: 'income', category: 'Sales', amountKobo: n(500), occurredOn: '2026-06-02' },
    ]);

    assert.deepEqual(
      series.map((p) => p.month),
      ['2026-06', '2026-07'],
      'months must come back in chronological order'
    );
    assert.equal(series[1].profitKobo, n(200));
  });

  test('category breakdown sorts biggest first and ignores the other type', () => {
    const slices = byCategory(
      [
        { type: 'expense', category: 'Procurement', amountKobo: n(240) , occurredOn: '2026-07-01' },
        { type: 'expense', category: 'Logistics', amountKobo: n(35), occurredOn: '2026-07-01' },
        { type: 'expense', category: 'Procurement', amountKobo: n(60), occurredOn: '2026-07-02' },
        { type: 'income', category: 'Sales', amountKobo: n(999), occurredOn: '2026-07-01' },
      ],
      'expense'
    );

    assert.deepEqual(slices, [
      { name: 'Procurement', valueKobo: n(300) },
      { name: 'Logistics', valueKobo: n(35) },
    ]);
  });
});

describe('money', () => {
  test('parses naira input including separators and currency signs', () => {
    assert.equal(nairaToKobo('7,500.50'), 750_050);
    assert.equal(nairaToKobo('₦1,200'), 120_000);
    assert.equal(nairaToKobo('0'), 0);
  });

  test('rejects junk rather than coercing it to zero', () => {
    assert.equal(nairaToKobo('abc'), null);
    assert.equal(nairaToKobo(''), null);
    assert.equal(nairaToKobo('1.2.3'), null);
  });

  test('rounds to the nearest kobo instead of truncating', () => {
    assert.equal(nairaToKobo('0.015'), 2);
  });

  test('percent returns 0 rather than NaN when dividing by zero', () => {
    assert.equal(percent(5, 0), 0);
  });

  test('short format abbreviates and keeps the sign', () => {
    assert.equal(formatKoboShort(n(7_500_000)), '₦7.50M');
    assert.equal(formatKoboShort(n(1_500)), '₦1.5K');
    assert.equal(formatKoboShort(n(-2_000_000)), '-₦2.00M');
  });
});
