import { redirect } from 'next/navigation';
import { getAuth, authConfigured } from './server';
import { parseRoles, hasAtLeast, type Role } from './roles';

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  roles: Role[];
  banned: boolean;
}

/**
 * Resolve the signed-in user from the session cookie.
 *
 * The middleware already redirects unauthenticated traffic, but every page and
 * server action calls this again on the server. Middleware protects navigation;
 * it does not protect a server action invoked directly, so authorisation is
 * re-checked at the point of use rather than assumed from the route.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  // Fail loudly on a misconfigured deploy. Without this the SDK would treat an
  // empty base URL as "no session" and every user would look signed out, which
  // reads as a login bug rather than missing configuration.
  if (!authConfigured()) {
    throw new Error(
      'Neon Auth is not configured. Set NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET.'
    );
  }

  const { data: session } = await getAuth().getSession();
  const user = session?.user as
    | { id: string; email: string; name?: string | null; role?: string | null; banned?: boolean | null }
    | undefined;

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name ?? user.email,
    roles: parseRoles(user.role),
    banned: Boolean(user.banned),
  };
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/sign-in');

  // A ban revokes access immediately, even if the cookie is still valid.
  if (user.banned) redirect('/auth/sign-in?error=banned');

  return user;
}

/**
 * Gate a page or action on a minimum role. Throws rather than redirects for
 * server actions, so a forbidden call fails loudly instead of silently
 * returning a login page as if it had succeeded.
 */
export async function requireRole(minimum: Role): Promise<CurrentUser> {
  const user = await requireUser();

  if (!hasAtLeast(user.roles, minimum)) {
    throw new Error(`Forbidden: this action requires the ${minimum} role.`);
  }

  return user;
}
