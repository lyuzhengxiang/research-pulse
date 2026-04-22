'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatRelative, cn } from '@/lib/utils';
import type { Paper, PaperLink, PaperMetric } from '@research-pulse/shared';

type LatestMetrics = {
  stars?: number;
  hnScore?: number;
  hnComments?: number;
};

export function PulseCard({ paper }: { paper: Paper }) {
  const [metrics, setMetrics] = useState<LatestMetrics>({});
  const [links, setLinks] = useState<PaperLink[]>([]);
  const [flash, setFlash] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;

    async function loadInitial() {
      const [{ data: m }, { data: l }] = await Promise.all([
        supabase
          .from('paper_metrics')
          .select('*')
          .eq('arxiv_id', paper.arxiv_id)
          .order('recorded_at', { ascending: false })
          .limit(30),
        supabase
          .from('paper_links')
          .select('*')
          .eq('arxiv_id', paper.arxiv_id),
      ]);

      if (!mounted) return;
      setLinks((l ?? []) as PaperLink[]);
      setMetrics(aggregateLatest((m ?? []) as PaperMetric[]));
    }
    loadInitial();

    const channel = supabase
      .channel(`card:${paper.arxiv_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'paper_metrics',
          filter: `arxiv_id=eq.${paper.arxiv_id}`,
        },
        (payload) => {
          const m = payload.new as PaperMetric;
          setMetrics((prev) => ({ ...prev, [metricKey(m)]: m.value }));
          setFlash(true);
          setTimeout(() => setFlash(false), 1000);
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [paper.arxiv_id, supabase]);

  const githubLink = links.find((l) => l.source === 'github');
  const hnLink = links.find((l) => l.source === 'hn');

  return (
    <Link
      href={`/paper/${encodeURIComponent(paper.arxiv_id)}`}
      className={cn(
        'block rounded-lg border border-white/10 bg-white/5 p-4 transition hover:border-accent-500/50 hover:bg-white/[0.07]',
        flash && 'animate-flash',
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2 text-xs text-white/50">
            <span className="rounded bg-accent-900/40 px-1.5 py-0.5 font-mono text-accent-400">
              {paper.primary_category}
            </span>
            <span>{formatRelative(paper.published_at)}</span>
            <span className="font-mono">{paper.arxiv_id}</span>
          </div>
          <h2 className="mb-1 font-medium leading-snug">{paper.title}</h2>
          <p className="mb-2 line-clamp-1 text-sm text-white/60">
            {paper.authors.slice(0, 4).join(', ')}
            {paper.authors.length > 4 && ` +${paper.authors.length - 4}`}
          </p>
          {paper.tldr ? (
            <p className="text-sm text-white/80">{paper.tldr}</p>
          ) : (
            <p className="text-sm italic text-white/40">TLDR generating…</p>
          )}
        </div>
        <div className="flex min-w-[8rem] flex-col items-end gap-1 text-xs">
          <PulseBar score={paper.pulse_score} />
          {githubLink && (
            <span className="flex items-center gap-1 text-white/70">
              <span>⭐</span>
              <span className="font-mono">{metrics.stars ?? '—'}</span>
            </span>
          )}
          {hnLink && (
            <span className="flex items-center gap-1 text-white/70">
              <span>🔶</span>
              <span className="font-mono">
                {metrics.hnScore ?? '—'}
                {metrics.hnComments != null && ` · ${metrics.hnComments}c`}
              </span>
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function PulseBar({ score }: { score: number }) {
  const width = Math.min(100, Math.max(4, Math.log10(Math.max(1, score + 1)) * 30));
  return (
    <div className="flex items-center gap-2">
      <span className="text-white/50">pulse</span>
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full bg-gradient-to-r from-accent-500 to-accent-400"
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="font-mono text-white/70">{score.toFixed(1)}</span>
    </div>
  );
}

function metricKey(m: PaperMetric): keyof LatestMetrics {
  if (m.metric === 'stars') return 'stars';
  if (m.metric === 'hn_score') return 'hnScore';
  return 'hnComments';
}

function aggregateLatest(metrics: PaperMetric[]): LatestMetrics {
  const out: LatestMetrics = {};
  for (const m of metrics) {
    const key = metricKey(m);
    if (out[key] == null) out[key] = m.value;
  }
  return out;
}
