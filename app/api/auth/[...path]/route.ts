import { getAuth } from '@/lib/auth/server';

// Neon Auth serves sign-in, sign-up, session and admin endpoints under /api/auth.
//
// The handler pair is built on first request rather than at module scope: doing
// it eagerly would construct the auth client during `next build`, which requires
// the cookie secret. Cached after the first call.
type Handler = (request: Request, context: unknown) => Promise<Response>;

let handlers: { GET: Handler; POST: Handler } | null = null;

function resolve() {
  if (!handlers) handlers = getAuth().handler() as unknown as typeof handlers;
  return handlers!;
}

/**
 * Rebuild the request against the public origin before handing it to Neon Auth.
 *
 * Behind the App Hosting proxy the container sees `host: ...run.app` and Next
 * derives `request.url` as `https://0.0.0.0:8080/...` — its own bind address.
 * Neon Auth builds the origin it validates from that URL, so every sign-in was
 * rejected with INVALID_ORIGIN even though the browser's own Origin header was
 * correct and the domain was in Neon's trusted origins. Confirmed by comparing
 * a direct call to Neon (reached password validation) against the same call
 * through this route (rejected).
 *
 * `x-forwarded-host` carries the real public hostname, so use that, falling back
 * to APP_ORIGIN and finally to the request as-is for local development where
 * there is no proxy.
 */
function withPublicOrigin(request: Request): Request {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https';

  let origin: string | null = null;
  if (forwardedHost) {
    origin = `${forwardedProto}://${forwardedHost}`;
  } else if (process.env.APP_ORIGIN) {
    origin = process.env.APP_ORIGIN;
  }

  if (!origin) return request;

  const incoming = new URL(request.url);
  const target = new URL(incoming.pathname + incoming.search, origin);

  // Same-origin already (local dev): nothing to rewrite.
  if (target.origin === incoming.origin) return request;

  const headers = new Headers(request.headers);
  // Better Auth checks the Origin header too, so keep the two consistent.
  headers.set('origin', target.origin);
  headers.set('host', target.host);

  return new Request(target, {
    method: request.method,
    headers,
    body: request.body,
    redirect: 'manual',
    // Node requires this when a streaming body is passed through.
    ...({ duplex: 'half' } as Record<string, unknown>),
  });
}

export const GET: Handler = (request, context) => resolve().GET(withPublicOrigin(request), context);
export const POST: Handler = (request, context) =>
  resolve().POST(withPublicOrigin(request), context);
