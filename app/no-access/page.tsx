import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth/guard';
import { signOut } from '../auth/actions';
import styles from '../auth/auth.module.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'No access — Command Centre' };

/**
 * Where a signed-in account with no role lands.
 *
 * Neon Auth cannot restrict sign-up yet, so anyone can create an account against
 * this project. They arrive here and see nothing about the business — not a
 * balance, not a customer, not a supplier.
 */
export default async function NoAccessPage() {
  const user = await getCurrentUser();

  return (
    <main className={styles.shell}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.mark}>FF</span>
          <span>
            <span className={styles.wordmark}>FUUD FARMS</span>
            <span className={styles.sub}>Command Centre</span>
          </span>
        </div>

        <h1 className={styles.title}>No access</h1>
        <p className={styles.lede}>
          {user ? (
            <>
              You are signed in as <strong>{user.email}</strong>, but this account has not
              been given a role. An administrator has to grant you one before you can see
              anything here.
            </>
          ) : (
            <>This account has not been given access to the Command Centre.</>
          )}
        </p>

        <form action={signOut}>
          <button className={styles.submit} type="submit">
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
