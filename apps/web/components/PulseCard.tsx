'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatRelative, cn } from '@/lib/utils';
import { Sparkline } from './Sparkline';
import type { Paper, PaperLink, PaperMetric } from '@research-pulse/shared';

type LatestMetrics = {
  stars?: number;
  hnScore?: number;
  hnComments?: number;
};

const FRESH_HOURS = 24;

export function PulseCard({ paper: initialPaper }: { paper: Paper }) {
  const [paper, setPaper] = useState<Paper>(initialPaper);
  const [metricHistory, setMetricHistory] = useState<PaperMetric[]>([]);
  const [links, setLinks] = useState<PaperLink[]>([]);
  const [flash, setFlash] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setPaper(initialPaper);
  }, [initialPaper]);

  useEffect(() => {
    let mounted = true;

    async function loadInitial() {
      const [{ data: m }, { data: l }] = await Promise.all([
        supabase
          .from('paper_metrics')
          .select('*')
          .eq('arxiv_id', initialPaper.arxiv_id)
          .order('recorded_at', { ascending: true })
          .limit(60),
        supabase
          .from('paper_links')
          .select('*')
          .eq('arxiv_id', initialPaper.arxiv_id),
      ]);

      if (!mounted) return;
      setLinks((l ?? []) as PaperLink[]);
      setMetricHistory((m ?? []) as PaperMetric[]);
    }
    loadInitial();

    const channel = supabase
      .channel(`card:${initialPaper.arxiv_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'paper_metrics',
          filter: `arxiv_id=eq.${initialPaper.arxiv_id}`,
        },
        (payload) => {
          const m = payload.new as PaperMetric;
          setMetricHistory((prev) => [...prev.slice(-59), m]);
          setFlash(true);
          setTimeout(() => setFlash(false), 700);
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'papers',
          filter: `arxiv_id=eq.${initialPaper.arxiv_id}`,
        },
        (payload) => {
          setPaper((prev) => ({ ...prev, ...(payload.new as Paper) }));
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'paper_links',
          filter: `arxiv_id=eq.${initialPaper.arxiv_id}`,
        },
        (payload) => {
          const link = payload.new as PaperLink;
          setLinks((prev) =>
            prev.some((l) => l.id === link.id) ? prev : [...prev, link],
          );
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [initialPaper.arxiv_id, supabase]);

  const latest = useMemo<LatestMetrics>(() => aggregateLatest(metricHistory), [metricHistory]);
  const starSeries = useMemo(
    () =>
      metricHistory
        .filter((m) => m.metric === 'stars')
        .map((m) => m.value),
    [metricHistory],
  );
  const githubLink = links.find((l) => l.source === 'github');
  const hnLink = links.find((l) => l.source === 'hn');

  const ageHours = (Date.now() - new Date(paper.published_at).getTime()) / 3_600_000;
  const isFresh = ageHours < FRESH_HOURS;
  const hasPulse = paper.pulse_score > 0.1;

  return (
    <Link
      href={`/paper/${encodeURIComponent(paper.arxiv_id)}`}
      className={cn(
        'group block border-l-2 border-border bg-bg-surface/60 pl-4 pr-4 py-4 transition',
        'hover:border-l-up hover:bg-bg-raised',
        flash && 'animate-tick',
      )}
    >
      <div className="flex items-start gap-5">
        {/* Left: identifier + title block */}
        <div className="flex-1 min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
            <span className="text-info">[{paper.primary_category}]</span>
            <span className="text-ink-muted">{paper.arxiv_id}</span>
            <span className="text-ink-muted">·</span>
            <span className="text-ink-dim">{formatRelative(paper.published_at)}</span>
            {isFresh && (
              <span className="border border-up/50 bg-up/10 px-1.5 py-0.5 text-[10px] tracking-[0.15em] text-up">
                NEW
              </span>
            )}
          </div>
          <h2 className="text-base font-semibold leading-snug text-ink group-hover:text-up">
            <span className="text-ink-muted">▸ </span>
            {paper.title}
          </h2>
          <p className="mt-1 truncate text-xs text-ink-dim">
            {paper.authors.slice(0, 4).join(', ')}
            {paper.authors.length > 4 && ` +${paper.authors.length - 4}`}
          </p>
          {paper.tldr ? (
            <p className="mt-2 line-clamp-2 text-sm text-ink-dim">{paper.tldr}</p>
          ) : (
            <p className="mt-2 text-xs italic text-ink-muted">
              <span className="animate-blink">▊</span> generating tldr…
            </p>
          )}
        </div>

        {/* Right: live metrics column */}
        <div className="flex shrink-0 flex-col items-end gap-1.5 text-xs">
          {hasPulse ? (
            <PulseReadout score={paper.pulse_score} />
          ) : (
            <span className="text-[10px] tracking-[0.15em] text-ink-muted">
              {isFresh ? 'AWAITING SIGNAL' : 'NO PULSE'}
            </span>
          )}
          {starSeries.length > 1 && (
            <div className="h-6">
              <Sparkline points={starSeries} width={104} height={24} stroke="#26e08a" />
            </div>
          )}
          <div className="flex gap-3">
            <MetricCell
              label="GH"
              value={githubLink ? latest.stars : null}
              color="text-up"
              dim={!githubLink}
            />
            <MetricCell
              label="HN"
              value={hnLink ? latest.hnScore : null}
              sub={hnLink && latest.hnComments != null ? `${latest.hnComments}c` : null}
              color="text-warn"
              dim={!hnLink}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

function MetricCell({
  label,
  value,
  sub,
  color,
  dim,
}: {
  label: string;
  value: number | null | undefined;
  sub?: string | null;
  color: string;
  dim?: boolean;
}) {
  return (
    <span className="tabular-nums">
      <span className={dim ? 'text-ink-muted' : 'text-ink-dim'}>{label}=</span>
      <span className={dim ? 'text-ink-muted' : color}>
        {value != null ? value : '—'}
      </span>
      {sub && <span className="ml-0.5 text-ink-muted">·{sub}</span>}
    </span>
  );
}

function PulseReadout({ score }: { score: number }) {
  const hot = score >= 50;
  const width = Math.min(100, Math.max(6, Math.log10(Math.max(1, score + 1)) * 30));
  const color = hot ? 'bg-danger' : score >= 5 ? 'bg-up' : 'bg-ink-muted';
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] tracking-[0.15em] text-ink-muted">PULSE</span>
      <div className="h-1.5 w-20 bg-bg-raised">
        <div className={cn('h-full', color)} style={{ width: `${width}%` }} />
      </div>
      <span className={cn('tabular-nums text-sm font-semibold', hot ? 'text-danger' : 'text-up')}>
        {score.toFixed(1)}
      </span>
    </div>
  );
}

function aggregateLatest(metrics: PaperMetric[]): LatestMetrics {
  const out: LatestMetrics = {};
  for (let i = metrics.length - 1; i >= 0; i--) {
    const m = metrics[i];
    if (m.metric === 'stars' && out.stars == null) out.stars = m.value;
    else if (m.metric === 'hn_score' && out.hnScore == null) out.hnScore = m.value;
    else if (m.metric === 'hn_comments' && out.hnComments == null) out.hnComments = m.value;
    if (out.stars != null && out.hnScore != null && out.hnComments != null) break;
  }
  return out;
}
