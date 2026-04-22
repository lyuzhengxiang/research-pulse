'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function onClick() {
    await supabase.auth.signOut();
    router.refresh();
    router.push('/');
  }

  return (
    <button
      onClick={onClick}
      className="px-2 py-1 text-sm tracking-wider text-ink-dim transition hover:text-danger"
    >
      <span className="ascii-bracket">LOGOUT</span>
    </button>
  );
}
