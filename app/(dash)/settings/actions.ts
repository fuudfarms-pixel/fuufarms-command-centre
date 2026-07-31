'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { capitalEvents } from '@/db/schema';
import { requireRole } from '@/lib/auth/guard';
import { record } from '@/lib/audit';
import { type ActionState, ok, fail, text, money, isoDate, oneOf } from '@/lib/forms';
import { CAPITAL_DIRECTIONS } from '@/lib/domain';

/**
 * Capital is a series of events, not a number you overwrite.
 *
 * The tracker had a single `capital` field with an "Update Capital" button. That
 * lost the history and, worse, meant capital never moved when it was spent —
 * which is what made net worth double-count.
 */
export async function addCapitalEvent(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireRole('admin');

  const direction = oneOf(form, 'direction', CAPITAL_DIRECTIONS);
  const amountKobo = money(form, 'amount');
  const note = text(form, 'note') ?? '';

  if (!direction) return fail('Choose whether capital came in or went out.');
  if (amountKobo === null) return fail('Enter a valid amount.');
  if (amountKobo === 0) return fail('Amount must be more than zero.');

  const signed = direction === 'in' ? amountKobo : -amountKobo;

  const [row] = await db
    .insert(capitalEvents)
    .values({ amountKobo: signed, note, occurredOn: isoDate(form, 'date'), createdBy: user.id })
    .returning();

  await record(db as never, user, 'capital.create', 'capital_events', row.id, null, row);
  revalidatePath('/settings');
  revalidatePath('/');
  return ok;
}

export async function deleteCapitalEvent(id: string): Promise<void> {
  const user = await requireRole('admin');
  const [existing] = await db.select().from(capitalEvents).where(eq(capitalEvents.id, id));
  if (!existing) return;

  await db.delete(capitalEvents).where(eq(capitalEvents.id, id));
  await record(db as never, user, 'capital.delete', 'capital_events', id, existing, null);
  revalidatePath('/settings');
  revalidatePath('/');
}
