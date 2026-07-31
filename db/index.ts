import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle, type NeonDatabase } from 'drizzle-orm/neon-serverless';
import { requireEnv } from '@/lib/env';
import * as schema from './schema';

/**
 * The WebSocket (Pool) driver, not the HTTP one.
 *
 * neon-http cannot do interactive transactions — it sends one statement per
 * round trip. Fulfilling an order has to read stock, verify it, then write a
 * movement, a transaction and an order update as one atomic unit; on HTTP a
 * failure halfway would leave stock decremented with no income recorded. For a
 * ledger that is not an acceptable failure mode, so we pay the WebSocket
 * connection cost to get real BEGIN/COMMIT.
 */
if (!neonConfig.webSocketConstructor && typeof globalThis.WebSocket !== 'undefined') {
  // Node 22 ships a global WebSocket, so no `ws` dependency is needed.
  neonConfig.webSocketConstructor = globalThis.WebSocket as never;
}

type Database = NeonDatabase<typeof schema>;

let instance: Database | null = null;

function connect(): Database {
  if (!instance) {
    const pool = new Pool({ connectionString: requireEnv('DATABASE_URL') });
    instance = drizzle(pool, { schema });
  }
  return instance;
}

/**
 * Connects on first use rather than on import, so `next build` does not need
 * DATABASE_URL.
 */
export const db: Database = new Proxy({} as Database, {
  get: (_target, prop, receiver) => Reflect.get(connect(), prop, receiver),
});

export { schema };
