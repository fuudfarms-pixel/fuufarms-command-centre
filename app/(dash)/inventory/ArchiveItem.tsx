'use client';

import { RowAction } from '@/components/Form';
import { archiveItem } from './actions';

export function ArchiveItem({ id, product }: { id: string; product: string }) {
  return (
    <RowAction
      action={async () => archiveItem(id)}
      label="Archive"
      pendingLabel="…"
      confirm={`Archive ${product}? Its movement history is kept.`}
    />
  );
}
