'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './BottomNav.module.css';

const tabs = [
  {
    href: '/home',
    label: 'Home',
    id: 'nav-home',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'var(--google-blue)' : 'none'}
        stroke={active ? 'var(--google-blue)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/>
      </svg>
    ),
  },
  {
    href: '/saved',
    label: 'Saved',
    id: 'nav-saved',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'var(--google-blue)' : 'none'}
        stroke={active ? 'var(--google-blue)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
      </svg>
    ),
  },
  {
    href: '/profile',
    label: 'Profile',
    id: 'nav-profile',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'var(--google-blue)' : 'none'}
        stroke={active ? 'var(--google-blue)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Main navigation">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
        return (
          <Link
            key={tab.href}
            href={tab.href}
            id={tab.id}
            className={`${styles.tab} ${isActive ? styles.active : ''}`}
            aria-current={isActive ? 'page' : undefined}
            aria-label={tab.label}
          >
            <span className={styles.icon}>{tab.icon(isActive)}</span>
            <span className={styles.label}>{tab.label}</span>
            {isActive && <span className={styles.indicator} aria-hidden />}
          </Link>
        );
      })}
    </nav>
  );
}
