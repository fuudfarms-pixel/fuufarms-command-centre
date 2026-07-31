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

export const GET: Handler = (request, context) => resolve().GET(request, context);
export const POST: Handler = (request, context) => resolve().POST(request, context);
