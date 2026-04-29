'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlertBell } from './AlertBell';
import { SignOutButton } from './SignOutButton';

const NAV: Array<{ href: string; label: string }> = [
  { href: '/', label: 'Feed' },
  { href: '/trending', label: 'Trending' },
  { href: '/watchlist', label: 'Starred' },
  { href: '/settings', label: 'Settings' },
];

export function MastheadNav({
  signedIn,
  userId,
}: {
  signedIn: boolean;
  userId: string | null;
}) {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/' || pathname.startsWith('/paper');
    return pathname === href || pathname.startsWith(href + '/');
  }
  const todayActive = pathname === '/today';

  return (
    <nav className="mt-2.5 flex items-center justify-center gap-7 border-t border-ink-rule pt-2 pb-1 font-mono text-ticker uppercase tracking-kicker">
      {NAV.map(({ href, label }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            className={`pb-0.5 transition ${
              active
                ? 'border-b-2 border-almanac-red font-bold text-almanac-red'
                : 'text-ink hover:text-almanac-red'
            }`}
          >
            {label}
          </Link>
        );
      })}
      <span className="text-ink-mute">│</span>
      <Link
        href="/today"
        className={`pb-0.5 font-serif italic ${
          todayActive
            ? 'border-b-2 border-almanac-red text-almanac-red'
            : 'text-almanac-gold hover:text-almanac-red'
        }`}
        style={{ fontSize: 13, letterSpacing: '0.1em', textTransform: 'none' }}
      >
        ✦ Daily Digest
      </Link>

      {signedIn && userId && (
        <>
          <span className="text-ink-mute">│</span>
          <AlertBell userId={userId} />
          <SignOutButton />
        </>
      )}
      {!signedIn && (
        <>
          <span className="text-ink-mute">│</span>
          <Link
            href="/sign-in"
            className="text-ink hover:text-almanac-red"
            style={{ fontSize: 11 }}
          >
            sign in ↗
          </Link>
        </>
      )}
    </nav>
  );
}
