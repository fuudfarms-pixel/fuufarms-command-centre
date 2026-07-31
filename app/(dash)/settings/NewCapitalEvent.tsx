'use client';

import { Form, Field } from '@/components/Form';
import { addCapitalEvent } from './actions';

const today = () => new Date().toISOString().slice(0, 10);

export function NewCapitalEvent() {
  return (
    <Form action={addCapitalEvent} submitLabel="Record">
      <Field
        label="Direction"
        name="direction"
        options={[
          { value: 'in', label: 'Capital in' },
          { value: 'out', label: 'Withdrawal' },
        ]}
      />
      <Field label="Amount (₦)" name="amount" placeholder="7500000" />
      <Field label="Note" name="note" required={false} placeholder="Founder investment" />
      <Field label="Date" name="date" type="date" defaultValue={today()} />
    </Form>
  );
}
