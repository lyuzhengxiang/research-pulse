import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { AlertBell } from './AlertBell';
import { SignOutButton } from './SignOutButton';

export async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <header className="border-b border-white/10 bg-black/40 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-mono text-lg font-semibold">
          <span className="inline-block h-2 w-2 animate-pulse-slow rounded-full bg-accent-500" />
          Research Pulse
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-white/70 hover:text-white">Feed</Link>
          <Link href="/trending" className="text-white/70 hover:text-white">Trending</Link>
          {user && (
            <>
              <Link href="/watchlist" className="text-white/70 hover:text-white">Watchlist</Link>
              <Link href="/settings" className="text-white/70 hover:text-white">Settings</Link>
              <AlertBell userId={user.id} />
              <SignOutButton />
            </>
          )}
          {!user && (
            <Link
              href="/sign-in"
              className="rounded-md bg-accent-600 px-3 py-1.5 font-medium text-white hover:bg-accent-700"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
