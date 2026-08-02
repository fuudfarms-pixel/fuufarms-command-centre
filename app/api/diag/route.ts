import { headers } from 'next/headers';

/**
 * TEMPORARY diagnostic. Reports which origin this app believes it is serving
 * from when it sits behind the Firebase App Hosting proxy, because Neon Auth
 * rejects sign-in with INVALID_ORIGIN while a direct call using the public URL
 * succeeds — so the app is forwarding something else.
 *
 * Returns no cookies, no secrets and no configuration values: only the routing
 * headers needed to identify the mismatch. Delete once resolved.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const h = await headers();

  return Response.json({
    // What the app computes from the incoming request.
    requestUrl: request.url,
    requestOrigin: new URL(request.url).origin,

    // What the proxy actually forwarded.
    host: h.get('host'),
    xForwardedHost: h.get('x-forwarded-host'),
    xForwardedProto: h.get('x-forwarded-proto'),
    forwarded: h.get('forwarded'),
    origin: h.get('origin'),
    referer: h.get('referer'),

    // What we configured. Presence only — the value is a public URL anyway.
    appOriginConfigured: process.env.APP_ORIGIN ?? null,
    databaseUrlPresent: Boolean(process.env.DATABASE_URL),
    authBaseUrlPresent: Boolean(process.env.NEON_AUTH_BASE_URL),
    cookieSecretPresent: Boolean(process.env.NEON_AUTH_COOKIE_SECRET),
  });
}
