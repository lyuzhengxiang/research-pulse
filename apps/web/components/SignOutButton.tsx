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
      className="text-white/60 hover:text-white"
    >
      Sign out
    </button>
  );
}
