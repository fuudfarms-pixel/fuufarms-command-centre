import { createNeonAuth } from '@neondatabase/auth/next/server';
import { requireEnv, isConfigured } from '@/lib/env';

/**
 * Neon Auth (managed Better Auth). Neon runs the auth server; this is the client
 * that talks to it, and identity lands in the `neon_auth` schema of the same
 * database as the business tables — so users are joinable in SQL.
 *
 * Import from `@neondatabase/auth/next/server` specifically. The package root
 * also re-exports a React UI kit we do not use (we build our own sign-in pages),
 * and pulling that into a server module drags it into the bundle.
 *
 * Constructed lazily on first use, never at module scope. `createNeonAuth()`
 * validates its config eagerly and throws on a missing cookie secret, so building
 * at module scope would make `next build` require production secrets — which
 * breaks CI and turns a missing variable into an opaque build failure.
 */
type Auth = ReturnType<typeof createNeonAuth>;

let instance: Auth | null = null;

export function getAuth(): Auth {
  if (!instance) {
    instance = createNeonAuth({
      baseUrl: requireEnv('NEON_AUTH_BASE_URL'),
      cookies: { secret: requireEnv('NEON_AUTH_COOKIE_SECRET') },
      // Set NEON_AUTH_DEBUG=1 to trace the SDK's proxying — it reports the origin
      // it resolves and the upstream status, which is what identified the origin
      // rejection.
      ...(process.env.NEON_AUTH_DEBUG ? { logLevel: 'debug' as const } : {}),
    });
  }
  return instance;
}

export const authConfigured = () =>
  isConfigured('NEON_AUTH_BASE_URL', 'NEON_AUTH_COOKIE_SECRET');
