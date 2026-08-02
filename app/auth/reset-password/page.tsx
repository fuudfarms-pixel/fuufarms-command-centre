import type { Metadata } from 'next';
import Link from 'next/link';
import { ResetPasswordForm } from './ResetPasswordForm';
import styles from '../auth.module.css';

export const metadata: Metadata = { title: 'Choose a password — Command Centre' };

/**
 * Where Neon's reset email lands. The token arrives as a query parameter and is
 * posted straight back — it is never stored, and the link expires in 15 minutes.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;

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

        <h1 className={styles.title}>Choose a password</h1>

        {token && !error ? (
          <>
            <p className={styles.lede}>At least 12 characters.</p>
            <ResetPasswordForm token={token} />
          </>
        ) : (
          <p className={styles.lede}>
            This link is missing or has expired. Reset links last 15 minutes —{' '}
            <Link href="/auth/forgot-password">request a new one</Link>.
          </p>
        )}

        <p className={styles.foot}>
          <Link href="/auth/sign-in">Back to sign in</Link>
        </p>
      </div>
    </main>
  );
}
