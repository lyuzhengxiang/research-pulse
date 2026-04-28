'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function StarButton({
  arxivId,
  initialStarred,
  userId,
}: {
  arxivId: string;
  initialStarred: boolean;
  userId: string | null;
}) {
  const [starred, setStarred] = useState(initialStarred);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const supabase = createClient();

  if (!userId) {
    return (
      <button
        onClick={() => router.push('/sign-in')}
        className="font-mono text-meta tracking-mono-uc text-ink-mute uppercase hover:text-almanac-red"
      >
        sign in to add to ledger
      </button>
    );
  }

  async function toggle() {
    const next = !starred;
    setStarred(next);
    startTransition(async () => {
      if (next) {
        await supabase.from('user_starred_papers').insert({ user_id: userId, arxiv_id: arxivId });
      } else {
        await supabase
          .from('user_starred_papers')
          .delete()
          .eq('user_id', userId)
          .eq('arxiv_id', arxivId);
      }
      router.refresh();
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className="font-mono text-meta uppercase tracking-mono-uc font-bold transition disabled:opacity-50"
      style={{ color: starred ? '#16110b' : '#b1342a' }}
    >
      {starred ? '✓ in your ledger' : '★ add to ledger'}
    </button>
  );
}
