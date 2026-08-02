'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './shell.module.css';

/**
 * The Tabs component's treatment applied to the top-level nav: the current
 * section gains weight and a Blazing Flame underline. Needs the pathname, so
 * this is the one client component in the shell.
 */
export function Nav({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();

  return (
    <nav className={styles.nav}>
      {links.map((l) => {
        const active = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? 'page' : undefined}
            className={`${styles.link} ${active ? styles.linkActive : ''}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
