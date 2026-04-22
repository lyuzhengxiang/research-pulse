'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import type { PaperMetric } from '@research-pulse/shared';

type Point = {
  t: number;
  stars: number | null;
  hnScore: number | null;
  hnComments: number | null;
  label: string;
};

export function TimelineChart({ arxivId }: { arxivId: string }) {
  const [points, setPoints] = useState<Point[]>([]);
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;

    async function loadInitial() {
      const { data } = await supabase
        .from('paper_metrics')
        .select('*')
        .eq('arxiv_id', arxivId)
        .order('recorded_at', { ascending: true });
      if (!mounted) return;
      setPoints(collapseToSeries((data ?? []) as PaperMetric[]));
    }
    loadInitial();

    const channel = supabase
      .channel(`timeline:${arxivId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'paper_metrics',
          filter: `arxiv_id=eq.${arxivId}`,
        },
        (payload) => {
          const m = payload.new as PaperMetric;
          setPoints((prev) => mergePoint(prev, m));
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [arxivId, supabase]);

  if (points.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center border border-border bg-bg-surface/60 text-[11px] tracking-wider text-ink-muted">
        <span className="animate-blink mr-2">▊</span>
        awaiting metrics · worker polls every 15min for active papers
      </div>
    );
  }

  const axisTick = { fill: '#7a8397', fontSize: 10, fontFamily: 'inherit' };

  return (
    <div className="h-72 w-full border border-border bg-bg-surface/60 p-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#1e2636" />
          <XAxis dataKey="label" tick={axisTick} stroke="#1e2636" />
          <YAxis yAxisId="left" tick={axisTick} stroke="#1e2636" />
          <YAxis yAxisId="right" orientation="right" tick={axisTick} stroke="#1e2636" />
          <Tooltip
            contentStyle={{
              background: '#0f1420',
              border: '1px solid #2a3446',
              borderRadius: 0,
              fontFamily: 'inherit',
              fontSize: 11,
              padding: '6px 10px',
            }}
            labelStyle={{ color: '#7a8397' }}
            itemStyle={{ color: '#d4dce8' }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, fontFamily: 'inherit', color: '#7a8397' }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="stars"
            name="GH★"
            stroke="#00d97e"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="hnScore"
            name="HN·pts"
            stroke="#ffa940"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="hnComments"
            name="HN·cmts"
            stroke="#60a5fa"
            strokeWidth={1.5}
            strokeDasharray="3 3"
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function pointLabel(t: number): string {
  const d = new Date(t);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

function collapseToSeries(metrics: PaperMetric[]): Point[] {
  const buckets = new Map<number, Point>();
  for (const m of metrics) {
    const bucket = Math.floor(new Date(m.recorded_at).getTime() / (60 * 1000)) * 60 * 1000;
    let pt = buckets.get(bucket);
    if (!pt) {
      pt = { t: bucket, stars: null, hnScore: null, hnComments: null, label: pointLabel(bucket) };
      buckets.set(bucket, pt);
    }
    if (m.metric === 'stars') pt.stars = m.value;
    else if (m.metric === 'hn_score') pt.hnScore = m.value;
    else if (m.metric === 'hn_comments') pt.hnComments = m.value;
  }
  return Array.from(buckets.values()).sort((a, b) => a.t - b.t);
}

function mergePoint(prev: Point[], m: PaperMetric): Point[] {
  const bucket = Math.floor(new Date(m.recorded_at).getTime() / (60 * 1000)) * 60 * 1000;
  const copy = [...prev];
  let idx = copy.findIndex((p) => p.t === bucket);
  if (idx === -1) {
    copy.push({ t: bucket, stars: null, hnScore: null, hnComments: null, label: pointLabel(bucket) });
    idx = copy.length - 1;
  }
  const pt = { ...copy[idx] };
  if (m.metric === 'stars') pt.stars = m.value;
  else if (m.metric === 'hn_score') pt.hnScore = m.value;
  else if (m.metric === 'hn_comments') pt.hnComments = m.value;
  copy[idx] = pt;
  return copy.sort((a, b) => a.t - b.t);
}
