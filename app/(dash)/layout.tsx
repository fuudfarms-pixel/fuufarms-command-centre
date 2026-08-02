import Link from 'next/link';
import { requireMember } from '@/lib/auth/guard';
import { canManageUsers } from '@/lib/auth/roles';
import { Logo } from '@/components/Brand';
import { signOut } from '../auth/actions';
import { Nav } from './Nav';
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
  const user = await requireMember();
  const links = canManageUsers(user.roles)
    ? [...LINKS, { href: '/admin/users', label: 'Users' }]
    : LINKS;

  return (
    <div className={styles.wrap}>
      <header className={styles.bar}>
        <div className={styles.inner}>
          <Link href="/" className={styles.brand} aria-label="Fuud Farms Command Centre">
            <Logo onColour height={34} className={styles.logo} />
          </Link>

          <Nav links={links} />

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
