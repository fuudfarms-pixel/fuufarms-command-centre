'use client';

import { Form, Field } from '@/components/Form';
import { createItem, receiveStock, adjustStock } from './actions';
import { UNITS } from '@/lib/domain';
import styles from '../page.module.css';

const today = () => new Date().toISOString().slice(0, 10);

export function InventoryForms({
  items,
  canAdjust,
}: {
  items: { id: string; label: string }[];
  canAdjust: boolean;
}) {
  const options = items.map((i) => ({ value: i.id, label: i.label }));

  return (
    <>
      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Add a product</h2>
        <Form action={createItem} submitLabel="Add">
          <Field label="Product" name="product" placeholder="Palm oil" />
          <Field label="Unit" name="unit" options={UNITS.map((u) => ({ value: u, label: u }))} />
          <Field label="Supplier" name="supplier" required={false} placeholder="Abia Mills" />
          <Field label="Cost / unit (₦)" name="cost" placeholder="1200" />
          <Field label="Market / unit (₦)" name="market" placeholder="1600" />
        </Form>
      </section>

      {items.length > 0 && (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Receive stock</h2>
          <Form action={receiveStock} submitLabel="Receive">
            <Field label="Product" name="itemId" options={options} />
            <Field label="Quantity" name="qty" placeholder="500" />
            <Field label="Cost / unit (₦)" name="unitCost" placeholder="1200" />
            <Field label="Date" name="date" type="date" defaultValue={today()} />
            <div className={styles.field}>
              <label htmlFor="alsoExpense">Post expense</label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  paddingTop: 8,
                  textTransform: 'none',
                  letterSpacing: 0,
                }}
              >
                <input id="alsoExpense" name="alsoExpense" type="checkbox" defaultChecked />
                Record the procurement cost too
              </label>
            </div>
          </Form>
        </section>
      )}

      {canAdjust && items.length > 0 && (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Adjust or write off</h2>
          <Form action={adjustStock} submitLabel="Adjust">
            <Field label="Product" name="itemId" options={options} />
            <Field label="Change (+/−)" name="delta" placeholder="-12" />
            <Field
              label="Reason"
              name="reason"
              options={[
                { value: 'adjustment', label: 'Correction' },
                { value: 'spoilage', label: 'Spoilage' },
              ]}
            />
            <Field label="Note" name="note" required={false} placeholder="Count correction" />
            <Field label="Date" name="date" type="date" defaultValue={today()} />
          </Form>
        </section>
      )}
    </>
  );
}
