import type { Metadata } from 'next';
import { LogoStacked, LeafWatermark } from '@/components/Brand';
import Link from 'next/link';
import { SignUpForm } from './SignUpForm';
import styles from '../auth.module.css';

export const metadata: Metadata = { title: 'Create account — Command Centre' };

export default function SignUpPage() {
  // Self-registration is closed unless INVITE_TOKEN is set. Normally accounts
  // are created by a super admin under /admin/users.
  const open = Boolean(process.env.INVITE_TOKEN);

  return (
    <main className={styles.shell}>
      <LeafWatermark className={styles.watermark} />
      <div className={styles.card}>
        <div className={styles.brand}>
          <LogoStacked />
        </div>

        <h1 className={styles.title}>Create account</h1>

        {open ? (
          <>
            <p className={styles.lede}>You will need the invite code from an administrator.</p>
            <SignUpForm />
          </>
        ) : (
          <p className={styles.lede}>
            Self-registration is closed. Ask an administrator to create your account.
          </p>
        )}

        <p className={styles.foot}>
          Already have an account? <Link href="/auth/sign-in">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
