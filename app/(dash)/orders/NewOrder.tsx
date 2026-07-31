'use client';

import { Form, Field } from '@/components/Form';
import { createOrder } from './actions';

const today = () => new Date().toISOString().slice(0, 10);

export function NewOrder({ items }: { items: { value: string; label: string }[] }) {
  return (
    <Form action={createOrder} submitLabel="Create">
      <Field label="Customer" name="customer" placeholder="Mama Cee Superstore" />
      <Field label="Product" name="itemId" options={items} />
      <Field label="Quantity" name="qty" placeholder="100" />
      <Field label="Unit price (₦)" name="unitPrice" placeholder="1600" />
      <Field label="Date" name="date" type="date" defaultValue={today()} />
    </Form>
  );
}
