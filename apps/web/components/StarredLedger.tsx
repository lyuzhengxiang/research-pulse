'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Sparkline } from './Sparkline';
import type { Paper, PaperMetric } from '@research-pulse/shared';

function relativeAge(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h`;
  const d = Math.round(h / 24);
  return `${d}d`;
}

export function StarredLedger({
  papers,
  metricsByArxiv,
}: {
  papers: Paper[];
  metricsByArxiv: Record<string, PaperMetric[]>;
}) {
  const [pulseByArxiv, setPulseByArxiv] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    for (const p of papers) m[p.arxiv_id] = p.pulse_score;
    return m;
  });
  const supabase = createClient();

  useEffect(() => {
    const ids = papers.map((p) => p.arxiv_id);
    if (ids.length === 0) return;

    const ch = supabase
      .channel('starred-ledger-updates')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'papers' },
        (payload) => {
          const p = payload.new as { arxiv_id: string; pulse_score: number };
          if (ids.includes(p.arxiv_id) && typeof p.pulse_score === 'number') {
            setPulseByArxiv((prev) => ({ ...prev, [p.arxiv_id]: p.pulse_score }));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [papers, supabase]);

  if (papers.length === 0) {
    return (
      <div className="border-b border-dotted border-ink-rule py-4 font-serif text-[16px] text-ink-mute">
        <div className="italic">No starred papers yet.</div>
        <div className="mt-1.5 not-italic">
          Browse{' '}
          <Link href="/trending" className="font-semibold text-almanac-red hover:underline">
            Trending
          </Link>
          {' '}or the{' '}
          <Link href="/" className="font-semibold text-almanac-red hover:underline">
            Feed
          </Link>
          {' '}and click the ★ on any paper to save it here.
        </div>
      </div>
    );
  }

  return (
    <ol className="m-0 list-none p-0">
      {papers.map((p, i) => (
        <LedgerEntry
          key={p.arxiv_id}
          index={i}
          paper={p}
          pulse={pulseByArxiv[p.arxiv_id] ?? p.pulse_score}
          metrics={metricsByArxiv[p.arxiv_id] ?? []}
        />
      ))}
    </ol>
  );
}

function LedgerEntry({
  index,
  paper,
  pulse,
  metrics,
}: {
  index: number;
  paper: Paper;
  pulse: number;
  metrics: PaperMetric[];
}) {
  const stars = useMemo(() => {
    const series = metrics.filter((m) => m.metric === 'stars');
    return series.length ? series[series.length - 1].value : null;
  }, [metrics]);

  const starsHourAgo = useMemo(() => {
    const hourAgo = Date.now() - 60 * 60 * 1000;
    const series = metrics.filter(
      (m) => m.metric === 'stars' && new Date(m.recorded_at).getTime() <= hourAgo,
    );
    return series.length ? series[series.length - 1].value : null;
  }, [metrics]);

  const hnScore = useMemo(() => {
    const series = metrics.filter((m) => m.metric === 'hn_score');
    return series.length ? series[series.length - 1].value : null;
  }, [metrics]);
  const hnComments = useMemo(() => {
    const series = metrics.filter((m) => m.metric === 'hn_comments');
    return series.length ? series[series.length - 1].value : null;
  }, [metrics]);

  const starSeries = useMemo(
    () => metrics.filter((m) => m.metric === 'stars').map((m) => m.value),
    [metrics],
  );
  const starsDelta = stars != null && starsHourAgo != null ? stars - starsHourAgo : null;

  return (
    <li>
      <Link
        href={`/paper/${encodeURIComponent(paper.arxiv_id)}`}
        className="almanac-link block border-b border-dotted border-ink-rule py-3"
      >
        <div className="flex items-baseline justify-between">
          <div className="font-mono uppercase tracking-mono-uc text-ink-mute" style={{ fontSize: 12 }}>
            #{String(index + 1).padStart(2, '0')} · {paper.primary_category} · {paper.arxiv_id}
          </div>
          <div className="tabnum font-serif text-list font-bold text-almanac-red">
            {pulse.toFixed(1)}
          </div>
        </div>
        <div className="mt-0.5 font-serif text-[18px] font-semibold leading-snug">
          {paper.title}
        </div>
        <div className="mt-0.5 font-serif italic text-meta text-ink-mute">
          {paper.authors[0] ?? '—'} et al — published {relativeAge(paper.published_at)} ago
        </div>
        <div className="mt-1.5 flex items-center gap-3.5 font-mono text-meta">
          <span>
            ★ <b className="tabnum">{stars != null ? stars.toLocaleString() : '—'}</b>
            {starsDelta != null && starsDelta > 0 && (
              <span className="ml-1 text-almanac-red"> +{starsDelta}/h</span>
            )}
          </span>
          <span>
            HN <b className="tabnum">{hnScore != null ? hnScore : '—'}</b>
            {hnComments != null && (
              <span className="text-ink-mute">·{hnComments}c</span>
            )}
          </span>
          <span className="ml-auto">
            <Sparkline points={starSeries} width={120} height={20} stroke="#b1342a" fillOpacity={0.16} />
          </span>
        </div>
      </Link>
    </li>
  );
}
