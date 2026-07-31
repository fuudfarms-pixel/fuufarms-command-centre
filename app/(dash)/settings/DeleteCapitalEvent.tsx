'use client';

import { RowAction } from '@/components/Form';
import { deleteCapitalEvent } from './actions';

export function DeleteCapitalEvent({ id }: { id: string }) {
  return (
    <RowAction
      action={async () => deleteCapitalEvent(id)}
      label="Delete"
      pendingLabel="…"
      confirm="Delete this capital event? Cash and net worth will change."
    />
  );
}
