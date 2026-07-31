import { auditLog } from '@/db/schema';
import type { CurrentUser } from './auth/guard';

/** Anything that can run a query — the db proxy or a transaction handle. */
type Executor = { insert: (table: typeof auditLog) => { values: (row: unknown) => Promise<unknown> } };

/**
 * Record who changed what.
 *
 * Takes an executor so it can be called inside a transaction — an audit row for
 * a write that later rolled back would be a lie.
 */
export async function record(
  exec: Executor,
  user: CurrentUser,
  action: string,
  entity: string,
  entityId: string | null,
  before: unknown = null,
  after: unknown = null
): Promise<void> {
  await exec.insert(auditLog).values({
    actorId: user.id,
    actorEmail: user.email,
    action,
    entity,
    entityId,
    before: before ?? null,
    after: after ?? null,
  });
}
