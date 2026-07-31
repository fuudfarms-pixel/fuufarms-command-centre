'use client';

import { Form, Field } from '@/components/Form';
import { createAsset } from './actions';
import { ASSET_CATEGORIES } from '@/lib/domain';
import styles from '../page.module.css';

const today = () => new Date().toISOString().slice(0, 10);

export function NewAsset() {
  return (
    <Form action={createAsset} submitLabel="Register">
      <Field label="Asset" name="name" placeholder="Delivery vehicle" />
      <Field
        label="Category"
        name="category"
        options={ASSET_CATEGORIES.map((c) => ({ value: c, label: c }))}
      />
      <Field label="Value (₦)" name="value" placeholder="800000" />
      <Field label="Acquired" name="date" type="date" defaultValue={today()} />
      <div className={styles.field}>
        <label htmlFor="alsoExpense">Paid for it</label>
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
          Record the cash going out
        </label>
      </div>
    </Form>
  );
}
