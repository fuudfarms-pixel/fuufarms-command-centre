import { NextResponse, type NextRequest } from 'next/server';
import { getAuth } from '@/lib/auth/server';

type Middleware = (request: NextRequest, event: unknown) => unknown;

let middleware: Middleware | null = null;

/**
 * Redirects unauthenticated *navigation* to the sign-in page. Nothing more.
 *
 * Non-GET requests deliberately bypass it. Neon Auth's middleware does not
 * recognise a valid session on POST — verified directly: the same session cookie
 * returns 200 on `GET /settings` and 307 to /auth/sign-in on `POST /settings`.
 * Since every Next server action is a POST to its own route, running it here
 * bounced every form submission to the login page, and the browser got an HTML
 * page where it expected an action result ("An unexpected response was received
 * from the server").
 *
 * Skipping it costs no security. Middleware never was the access control here:
 * every page calls requireUser() and every server action calls requireRole()
 * before touching data (lib/auth/guard.ts). A server action can be invoked
 * directly regardless of what middleware does, which is exactly why the checks
 * live at the point of use.
 */
export default function proxy(request: NextRequest, event: unknown) {
  if (request.method !== 'GET') return NextResponse.next();

  if (!middleware) {
    middleware = getAuth().middleware({ loginUrl: '/auth/sign-in' }) as Middleware;
  }
  return middleware(request, event);
}

/**
 * Deny by default: everything except the auth pages, the auth API and static
 * assets. A new route is protected the moment it exists rather than needing to
 * be added to a list.
 *
 * `brand/` holds the logo and leaf watermark, which the signed-OUT pages render.
 * Without the exemption the middleware redirects those requests to the sign-in
 * page, next/image gets HTML where it expected a PNG, and the logo renders
 * broken on precisely the page everyone sees first.
 */
export const config = {
  matcher: ['/((?!auth/|api/auth/|brand/|_next/static|_next/image|favicon.ico).*)'],
};
