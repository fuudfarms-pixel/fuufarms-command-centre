'use client';

import { RowAction } from '@/components/Form';
import { deleteTransaction } from './actions';

export function DeleteTransaction({ id }: { id: string }) {
  return (
    <RowAction
      action={async () => deleteTransaction(id)}
      label="Delete"
      pendingLabel="…"
      confirm="Delete this transaction? This cannot be undone."
    />
  );
}
