import { requireRole } from '@/lib/auth/guard';
import { ROLE_LABELS, ROLE_DESCRIPTIONS, ROLES, parseRoles } from '@/lib/auth/roles';
import { listUsers } from './actions';
import { NewUser } from './NewUser';
import { UserRow } from './UserRow';
import styles from '../../page.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Users — Command Centre' };

export default async function UsersPage() {
  // Gated here AND in every action — a server action can be invoked directly,
  // so page-level protection alone would not be protection.
  const me = await requireRole('admin');
  const users = await listUsers();

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Users</h1>
          <p className={styles.lede}>Who can reach the books, and what they can do.</p>
        </div>
      </header>

      <section className={styles.summary}>
        {ROLES.map((r) => (
          <div key={r} className={`${styles.stat} ${styles.brand}`}>
            <span className={styles.statLabel}>{ROLE_LABELS[r]}</span>
            <span className={`${styles.statValue} num`}>
              {users.filter((u) => parseRoles(u.role).includes(r)).length}
            </span>
            <span className={styles.lede} style={{ fontSize: 11 }}>
              {ROLE_DESCRIPTIONS[r]}
            </span>
          </div>
        ))}
      </section>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Invite Someone.</h2>
        <NewUser />
      </section>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Accounts.</h2>
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <UserRow key={u.id} user={u} isSelf={u.id === me.id} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
