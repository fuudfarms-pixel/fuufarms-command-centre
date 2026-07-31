import type { Config } from 'drizzle-kit';

export default {
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
  // Neon Auth owns `neon_auth`; drizzle must not try to manage or drop it.
  schemaFilter: ['public'],
} satisfies Config;
