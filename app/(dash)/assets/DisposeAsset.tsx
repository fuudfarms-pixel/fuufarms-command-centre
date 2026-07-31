'use client';

import { RowAction } from '@/components/Form';
import { disposeAsset } from './actions';

export function DisposeAsset({ id, name }: { id: string; name: string }) {
  return (
    <RowAction
      action={async () => disposeAsset(id)}
      label="Dispose"
      pendingLabel="…"
      confirm={`Mark ${name} as disposed? It leaves the balance sheet but the record is kept.`}
    />
  );
}
