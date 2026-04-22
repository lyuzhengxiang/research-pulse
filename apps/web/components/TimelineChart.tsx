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
      <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center text-sm text-white/50">
        No metrics recorded yet. The worker polls every 15 min for active papers.
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis
            dataKey="label"
            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
            stroke="rgba(255,255,255,0.2)"
          />
          <YAxis
            yAxisId="left"
            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
            stroke="rgba(255,255,255,0.2)"
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
            stroke="rgba(255,255,255,0.2)"
          />
          <Tooltip
            contentStyle={{ background: 'rgba(20,20,28,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6 }}
            labelStyle={{ color: '#ccc' }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="stars"
            name="GitHub stars"
            stroke="#a78bfa"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="hnScore"
            name="HN score"
            stroke="#f97316"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="hnComments"
            name="HN comments"
            stroke="#10b981"
            strokeWidth={1.5}
            strokeDasharray="4 4"
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
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function collapseToSeries(metrics: PaperMetric[]): Point[] {
  // Bucket by minute; within each bucket, last-wins per metric.
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
