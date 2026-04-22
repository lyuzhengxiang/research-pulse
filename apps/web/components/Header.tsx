import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { AlertBell } from './AlertBell';
import { SignOutButton } from './SignOutButton';
import { HeaderNavLink } from './HeaderNavLink';

export async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5 text-[13px]">
        <Link href="/" className="group flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 bg-up shadow-[0_0_8px_#00d97e] animate-blink" />
          <span className="text-ink">
            <span className="text-ink-dim">$</span>{' '}
            <span className="font-semibold tracking-wider">RESEARCH-PULSE</span>
            <span className="text-ink-muted">:~#</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          <HeaderNavLink href="/">FEED</HeaderNavLink>
          <HeaderNavLink href="/trending">TRENDING</HeaderNavLink>
          {user && <HeaderNavLink href="/watchlist">WATCH</HeaderNavLink>}
          {user && <HeaderNavLink href="/settings">CONFIG</HeaderNavLink>}
          {user && (
            <>
              <span className="mx-2 text-ink-muted">│</span>
              <AlertBell userId={user.id} />
              <SignOutButton />
            </>
          )}
          {!user && (
            <Link
              href="/sign-in"
              className="ml-3 border border-up/60 bg-up/10 px-3 py-1 text-up transition hover:bg-up/20"
            >
              <span className="text-ink-muted">$</span> login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
