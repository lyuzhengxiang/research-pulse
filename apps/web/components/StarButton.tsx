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
        className="rounded-md border border-white/20 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
      >
        Sign in to star
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
      className={`rounded-md border px-3 py-1.5 text-sm transition ${
        starred
          ? 'border-accent-500 bg-accent-500/20 text-accent-300'
          : 'border-white/20 bg-white/5 hover:bg-white/10'
      }`}
    >
      {starred ? '★ Starred' : '☆ Star'}
    </button>
  );
}
