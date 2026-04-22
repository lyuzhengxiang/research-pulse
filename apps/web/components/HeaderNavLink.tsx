'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function HeaderNavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={cn(
        'px-2 py-1 text-sm tracking-wider transition',
        active
          ? 'text-up'
          : 'text-ink-dim hover:text-ink',
      )}
    >
      <span className="ascii-bracket">{children}</span>
    </Link>
  );
}
