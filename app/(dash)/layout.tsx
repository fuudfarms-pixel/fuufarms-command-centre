import Link from 'next/link';
import { requireUser } from '@/lib/auth/guard';
import { canManageUsers } from '@/lib/auth/roles';
import { signOut } from '../auth/actions';
import styles from './shell.module.css';

const LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/transactions', label: 'Transactions' },
  { href: '/inventory', label: 'Inventory' },
  { href: '/orders', label: 'Orders' },
  { href: '/assets', label: 'Assets' },
  { href: '/settings', label: 'Capital' },
];

export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const links = canManageUsers(user.roles)
    ? [...LINKS, { href: '/admin/users', label: 'Users' }]
    : LINKS;

  return (
    <div className={styles.wrap}>
      <header className={styles.bar}>
        <div className={styles.inner}>
          <Link href="/" className={styles.brand}>
            <span className={styles.mark}>FF</span>
            <span>
              <span className={styles.wordmark}>FUUD FARMS</span>
              <span className={styles.sub}>Command Centre</span>
            </span>
          </Link>

          <nav className={styles.nav}>
            {links.map((l) => (
              <Link key={l.href} href={l.href} className={styles.link}>
                {l.label}
              </Link>
            ))}
          </nav>

          <form action={signOut} className={styles.out}>
            <span className={styles.who} title={user.email}>
              {user.name}
            </span>
            <button type="submit" className={styles.signout}>
              Sign out
            </button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}
