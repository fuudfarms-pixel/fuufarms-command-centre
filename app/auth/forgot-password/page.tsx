import type { Metadata } from 'next';
import { LogoStacked, LeafWatermark } from '@/components/Brand';
import Link from 'next/link';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import styles from '../auth.module.css';

export const metadata: Metadata = { title: 'Set your password — Command Centre' };

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;

  return (
    <main className={styles.shell}>
      <LeafWatermark className={styles.watermark} />
      <div className={styles.card}>
        <div className={styles.brand}>
          <LogoStacked />
        </div>

        {sent ? (
          <>
            <h1 className={styles.title}>Check your email</h1>
            <p className={styles.lede}>
              If that address has an account, a link to set a password is on its way. It
              expires in 15 minutes.
            </p>
          </>
        ) : (
          <>
            <h1 className={styles.title}>Set your password</h1>
            <p className={styles.lede}>
              For a forgotten password, or to choose one for the first time on a new account.
              We will email you a link.
            </p>
            <ForgotPasswordForm />
          </>
        )}

        <p className={styles.foot}>
          <Link href="/auth/sign-in">Back to sign in</Link>
        </p>
      </div>
    </main>
  );
}
