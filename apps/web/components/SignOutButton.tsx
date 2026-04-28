'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function SignOutButton() {
  const [pending, start] = useTransition();
  const router = useRouter();
  const supabase = createClient();

  return (
    <button
      onClick={() =>
        start(async () => {
          await supabase.auth.signOut();
          router.push('/');
          router.refresh();
        })
      }
      disabled={pending}
      className="text-ink-mute transition hover:text-almanac-red disabled:opacity-50"
      style={{ fontSize: 11 }}
    >
      sign out ↗
    </button>
  );
}
