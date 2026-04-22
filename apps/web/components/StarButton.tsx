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
        className="border border-border bg-bg-surface/60 px-2.5 py-1 text-[12px] tracking-wide text-ink-dim transition hover:text-ink hover:border-bright"
      >
        login_to_track
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
      className={`border px-2.5 py-1 text-[12px] tracking-wide transition ${
        starred
          ? 'border-up/60 bg-up/10 text-up'
          : 'border-border bg-bg-surface/60 text-ink-dim hover:text-ink hover:border-bright'
      }`}
    >
      {starred ? '● tracking' : '○ track'}
    </button>
  );
}
