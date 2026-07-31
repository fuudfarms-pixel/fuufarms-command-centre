import type { Metadata } from 'next';
import { SignInForm } from './SignInForm';
import styles from '../auth.module.css';

export const metadata: Metadata = { title: 'Sign in — Command Centre' };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const notice =
    error === 'banned'
      ? 'That account has been suspended. Contact an administrator.'
      : null;

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

        <h1 className={styles.title}>Sign in</h1>
        <p className={styles.lede}>Capital, stock, orders and assets — in one place.</p>

        <SignInForm notice={notice} />
      </div>
    </main>
  );
}
