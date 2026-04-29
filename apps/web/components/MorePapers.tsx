'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Paper } from '@research-pulse/shared';
import { loadMorePapers } from '@/app/actions/feed';
import type { FeedScope } from '@/lib/papers';

function relativeAge(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h`;
  const d = Math.round(h / 24);
  return `${d}d`;
}

export function MorePapers({
  initial,
  scope,
  initialOffset,
}: {
  initial: Paper[];
  scope: FeedScope;
  initialOffset: number;
}) {
  const [papers, setPapers] = useState<Paper[]>(initial);
  const [offset, setOffset] = useState(initialOffset);
  const [done, setDone] = useState(initial.length === 0);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadNext = useCallback(async () => {
    if (loading || done) return;
    setLoading(true);
    try {
      const next = await loadMorePapers(scope, offset);
      if (next.length === 0) {
        setDone(true);
      } else {
        setPapers((prev) => {
          const seen = new Set(prev.map((p) => p.arxiv_id));
          const merged = [...prev];
          for (const p of next) if (!seen.has(p.arxiv_id)) merged.push(p);
          return merged;
        });
        setOffset(offset + next.length);
        if (next.length < 20) setDone(true);
      }
    } finally {
      setLoading(false);
    }
  }, [loading, done, offset, scope]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadNext();
      },
      { rootMargin: '600px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadNext]);

  if (papers.length === 0 && done) return null;

  return (
    <div className="px-10 pt-4 pb-8">
      <div className="mb-3.5 text-center font-mono text-ticker uppercase tracking-kicker text-almanac-red">
        — More Papers —
      </div>
      <div className="grid grid-cols-2 gap-x-9">
        {papers.map((p, i) => (
          <Link
            key={p.arxiv_id}
            href={`/paper/${encodeURIComponent(p.arxiv_id)}`}
            className="almanac-link block"
          >
            <div className="grid grid-cols-[32px_1fr_auto] gap-2 border-b border-dotted border-ink-rule py-2.5">
              <div className="font-serif text-[24px] font-bold leading-none text-almanac-red">
                {i % 4 === 0 ? '§' : '·'}
              </div>
              <div>
                <div className="font-serif text-list font-semibold leading-snug">{p.title}</div>
                <div className="mt-0.5 font-mono text-ticker text-ink-mute">
                  {p.primary_category} · {p.authors[0] ?? '—'} et al · {relativeAge(p.published_at)}
                </div>
              </div>
              <div className="text-right font-mono text-meta">
                <div className="tabnum font-bold text-almanac-red">
                  {p.pulse_score.toFixed(1)}
                </div>
                <div className="tabnum text-ink-mute">{p.is_active ? 'live' : 'archived'}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div ref={sentinelRef} className="h-10" aria-hidden />

      <div className="mt-2 text-center font-mono text-ticker uppercase tracking-mono-uc text-ink-mute">
        {loading
          ? 'loading more…'
          : done
          ? '— end of feed —'
          : ''}
      </div>
    </div>
  );
}
