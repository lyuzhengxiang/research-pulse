'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Sparkline } from './Sparkline';
import type { PaperMetric } from '@research-pulse/shared';

type Latest = { stars?: number; hnScore?: number; hnComments?: number };

export function LivePulseCard({
  arxivId,
  pulseScore,
}: {
  arxivId: string;
  pulseScore: number;
}) {
  const [history, setHistory] = useState<PaperMetric[]>([]);
  const [pulse, setPulse] = useState(pulseScore);
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data } = await supabase
        .from('paper_metrics')
        .select('*')
        .eq('arxiv_id', arxivId)
        .order('recorded_at', { ascending: true })
        .limit(96);
      if (mounted) setHistory((data ?? []) as PaperMetric[]);
    }
    load();

    const ch = supabase
      .channel(`live-pulse:${arxivId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'paper_metrics',
          filter: `arxiv_id=eq.${arxivId}`,
        },
        (payload) => {
          setHistory((prev) => [...prev.slice(-95), payload.new as PaperMetric]);
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'papers',
          filter: `arxiv_id=eq.${arxivId}`,
        },
        (payload) => {
          const p = payload.new as { pulse_score: number };
          if (typeof p.pulse_score === 'number') setPulse(p.pulse_score);
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [arxivId, supabase]);

  const starsSeries = useMemo(
    () => history.filter((m) => m.metric === 'stars').map((m) => m.value),
    [history],
  );
  const latest = useMemo<Latest>(() => {
    const out: Latest = {};
    for (let i = history.length - 1; i >= 0; i--) {
      const m = history[i];
      if (m.metric === 'stars' && out.stars == null) out.stars = m.value;
      else if (m.metric === 'hn_score' && out.hnScore == null) out.hnScore = m.value;
      else if (m.metric === 'hn_comments' && out.hnComments == null) out.hnComments = m.value;
      if (out.stars != null && out.hnScore != null && out.hnComments != null) break;
    }
    return out;
  }, [history]);

  return (
    <div className="border border-ink-rule">
      <div className="bg-ink-rule px-2.5 py-1 font-mono text-ticker uppercase tracking-mono-uc text-paper">
        Live Pulse · {starsSeries.length > 1 ? `${starsSeries.length} samples` : 'awaiting samples'}
      </div>
      <div className="p-2.5">
        {starsSeries.length > 1 ? (
          <Sparkline points={starsSeries} width={260} height={100} stroke="#b1342a" fillOpacity={0.2} />
        ) : (
          <div className="flex h-[100px] items-center justify-center font-mono text-meta italic text-ink-mute">
            worker polls every 15 min for active papers
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 border-t border-ink-rule">
        <Cell label="★" value={latest.stars != null ? latest.stars.toLocaleString() : '—'} />
        <Cell
          label="HN"
          value={
            latest.hnScore != null
              ? `${latest.hnScore}${latest.hnComments != null ? `·${latest.hnComments}c` : ''}`
              : '—'
          }
          divider
        />
        <Cell label="pulse" value={pulse.toFixed(1)} red divider />
      </div>
    </div>
  );
}

function Cell({
  label,
  value,
  red,
  divider,
}: {
  label: string;
  value: string;
  red?: boolean;
  divider?: boolean;
}) {
  return (
    <div
      className={`px-2 py-1.5 text-center ${divider ? 'border-l border-ink-rule' : ''}`}
    >
      <div className="font-mono uppercase tracking-mono-uc text-ink-mute" style={{ fontSize: 11 }}>
        {label}
      </div>
      <div
        className={`tabnum font-serif text-[18px] font-bold ${red ? 'text-almanac-red' : 'text-ink'}`}
      >
        {value}
      </div>
    </div>
  );
}
