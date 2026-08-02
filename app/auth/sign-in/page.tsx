import type { Metadata } from 'next';
import { LogoStacked, LeafWatermark } from '@/components/Brand';
import Link from 'next/link';
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
      <LeafWatermark className={styles.watermark} />
      <div className={styles.card}>
        <div className={styles.brand}>
          <LogoStacked />
        </div>

        <h1 className={styles.title}>Sign in</h1>
        <p className={styles.lede}>Capital, stock, orders and assets — in one place.</p>

        <SignInForm notice={notice} />

        <p className={styles.foot}>
          <Link href="/auth/forgot-password">Forgot your password?</Link>
        </p>
      </div>
    </main>
  );
}
