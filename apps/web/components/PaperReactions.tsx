'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  REACTION_EMOJI,
  REACTION_KINDS,
  type ReactionKind,
} from '@research-pulse/shared';

type Counts = Record<ReactionKind, number>;

const ZERO_COUNTS: Counts = { thumbs_up: 0, fire: 0, thinking: 0, poop: 0 };

export function PaperReactions({
  arxivId,
  userId,
  initialCounts,
  initialMine,
}: {
  arxivId: string;
  userId: string | null;
  initialCounts: Counts;
  initialMine: ReactionKind[];
}) {
  const [counts, setCounts] = useState<Counts>(initialCounts);
  const [mine, setMine] = useState<Set<ReactionKind>>(new Set(initialMine));
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const supabase = useMemo(() => createClient(), []);

  // Close popover on outside click / Esc.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Realtime: keep counts in sync with other users' reactions.
  // Skip echoes of our own edits — those are already applied optimistically.
  useEffect(() => {
    const ch = supabase
      .channel(`paper-reactions:${arxivId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'paper_reactions',
          filter: `arxiv_id=eq.${arxivId}`,
        },
        (payload) => {
          const row = payload.new as { user_id: string; kind: ReactionKind };
          if (row.user_id === userId) return;
          setCounts((c) => ({ ...c, [row.kind]: c[row.kind] + 1 }));
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'paper_reactions',
          filter: `arxiv_id=eq.${arxivId}`,
        },
        (payload) => {
          const row = payload.old as { user_id: string; kind: ReactionKind };
          if (row.user_id === userId) return;
          setCounts((c) => ({ ...c, [row.kind]: Math.max(0, c[row.kind] - 1) }));
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [arxivId, userId, supabase]);

  const total = REACTION_KINDS.reduce((acc, k) => acc + counts[k], 0);

  async function toggle(kind: ReactionKind) {
    if (!userId) return;
    const had = mine.has(kind);
    // Optimistic
    setMine((prev) => {
      const next = new Set(prev);
      if (had) next.delete(kind);
      else next.add(kind);
      return next;
    });
    setCounts((c) => ({ ...c, [kind]: Math.max(0, c[kind] + (had ? -1 : 1)) }));

    if (had) {
      const { error } = await supabase
        .from('paper_reactions')
        .delete()
        .eq('arxiv_id', arxivId)
        .eq('user_id', userId)
        .eq('kind', kind);
      if (error) {
        // Revert on failure
        setMine((prev) => new Set(prev).add(kind));
        setCounts((c) => ({ ...c, [kind]: c[kind] + 1 }));
      }
    } else {
      const { error } = await supabase
        .from('paper_reactions')
        .insert({ arxiv_id: arxivId, user_id: userId, kind });
      if (error) {
        setMine((prev) => {
          const next = new Set(prev);
          next.delete(kind);
          return next;
        });
        setCounts((c) => ({ ...c, [kind]: Math.max(0, c[kind] - 1) }));
      }
    }
  }

  const myEmojis = REACTION_KINDS.filter((k) => mine.has(k))
    .map((k) => REACTION_EMOJI[k])
    .join(' ');

  return (
    <div ref={wrapRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="inline-flex items-center gap-2 border border-ink-rule bg-paper px-3 py-1.5 font-mono text-meta uppercase tracking-mono-uc text-ink hover:bg-paper-2"
      >
        {myEmojis ? (
          <span className="text-[15px] leading-none">{myEmojis}</span>
        ) : (
          <span className="text-almanac-red">✦</span>
        )}
        <span>
          {total > 0 ? `${total} reaction${total === 1 ? '' : 's'}` : 'react'}
        </span>
        <span className="text-ink-mute">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="React to this paper"
          className="absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 border border-ink-rule bg-paper-2 px-3 py-3 shadow-[0_8px_24px_rgba(31,26,20,0.18)]"
        >
          <div className="flex items-center gap-2">
            {REACTION_KINDS.map((kind) => {
              const isMine = mine.has(kind);
              const count = counts[kind];
              const disabled = !userId;
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => toggle(kind)}
                  disabled={disabled}
                  aria-pressed={isMine}
                  className={
                    'flex flex-col items-center gap-0.5 border px-2.5 py-1.5 transition ' +
                    (isMine
                      ? 'border-almanac-red bg-paper'
                      : 'border-ink-rule bg-paper hover:bg-paper-3') +
                    (disabled ? ' opacity-60 cursor-not-allowed' : '')
                  }
                >
                  <span className="text-[20px] leading-none">{REACTION_EMOJI[kind]}</span>
                  <span className="font-mono text-ticker tabular-nums text-ink-mute">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          {!userId && (
            <div className="mt-2 text-center font-mono text-ticker uppercase tracking-mono-uc text-ink-mute">
              <Link href="/sign-in" className="text-almanac-red hover:underline">
                sign in to react ↗
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
