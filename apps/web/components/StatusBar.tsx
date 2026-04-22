'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatRelative } from '@/lib/utils';

type Stats = {
  papers: number;
  active: number;
  lastPoll: string | null;
  metricsLast1h: number;
};

export function StatusBar() {
  const [stats, setStats] = useState<Stats>({
    papers: 0,
    active: 0,
    lastPoll: null,
    metricsLast1h: 0,
  });
  const [tick, setTick] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;

    async function load() {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const [{ count: papers }, { count: active }, { data: lastMetric }, { count: metricsLast1h }] =
        await Promise.all([
          supabase.from('papers').select('*', { count: 'exact', head: true }),
          supabase
            .from('papers')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true),
          supabase
            .from('paper_metrics')
            .select('recorded_at')
            .order('recorded_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('paper_metrics')
            .select('*', { count: 'exact', head: true })
            .gte('recorded_at', hourAgo),
        ]);

      if (!mounted) return;
      setStats({
        papers: papers ?? 0,
        active: active ?? 0,
        lastPoll: lastMetric?.recorded_at ?? null,
        metricsLast1h: metricsLast1h ?? 0,
      });
    }

    load();
    const poll = setInterval(load, 30_000);
    const ticker = setInterval(() => setTick((t) => t + 1), 1_000);

    const channel = supabase
      .channel('status-bar')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'papers' },
        () => setStats((s) => ({ ...s, papers: s.papers + 1, active: s.active + 1 })),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'paper_metrics' },
        (payload) => {
          const recordedAt = (payload.new as { recorded_at: string }).recorded_at;
          setStats((s) => ({
            ...s,
            lastPoll: recordedAt,
            metricsLast1h: s.metricsLast1h + 1,
          }));
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      clearInterval(poll);
      clearInterval(ticker);
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Referenced to avoid unused-var warning; intentional dep for re-render.
  void tick;

  const lastPollStr = stats.lastPoll ? formatRelative(stats.lastPoll) : '—';
  const now = new Date();
  const clock = `${String(now.getUTCHours()).padStart(2, '0')}:${String(
    now.getUTCMinutes(),
  ).padStart(2, '0')}:${String(now.getUTCSeconds()).padStart(2, '0')} UTC`;

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-10 border-t border-border bg-bg/90 text-xs tracking-wider backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2">
        <div className="flex items-center gap-3 text-ink-dim">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 animate-blink bg-up shadow-[0_0_8px_#26e08a]" />
            <span className="text-up">RAILWAY·WORKER</span>
          </span>
          <span className="text-ink-muted">│</span>
          <span>
            papers=<span className="text-ink">{stats.papers}</span>
          </span>
          <span>
            active=<span className="text-ink">{stats.active}</span>
          </span>
          <span>
            writes/1h=<span className="text-info">{stats.metricsLast1h}</span>
          </span>
        </div>
        <div className="flex items-center gap-3 text-ink-dim">
          <span>
            last_poll=<span className="text-ink">{lastPollStr}</span>
          </span>
          <span className="text-ink-muted">│</span>
          <span className="text-ink">{clock}</span>
        </div>
      </div>
    </footer>
  );
}
