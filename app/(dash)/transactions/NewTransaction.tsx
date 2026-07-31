'use client';

import { useState } from 'react';
import { Form, Field } from '@/components/Form';
import { createTransaction } from './actions';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '@/lib/domain';

const today = () => new Date().toISOString().slice(0, 10);

export function NewTransaction() {
  // Category options follow the type, so an expense can never be filed under
  // "Sales". The server re-checks this — the client only keeps it tidy.
  const [type, setType] = useState('income');
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <Form action={createTransaction} submitLabel="Record">
      <Field
        label="Type"
        name="type"
        value={type}
        onChange={setType}
        options={[
          { value: 'income', label: 'Income' },
          { value: 'expense', label: 'Expense' },
        ]}
      />
      <Field
        label="Category"
        name="category"
        options={categories.map((c) => ({ value: c, label: c }))}
      />
      <Field label="Amount (₦)" name="amount" placeholder="0" />
      <Field label="Description" name="description" placeholder="Palm oil — 200L" />
      <Field label="Date" name="date" type="date" defaultValue={today()} />
    </Form>
  );
}
