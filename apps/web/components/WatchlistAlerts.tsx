'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatRelative } from '@/lib/utils';
import type { UserAlert } from '@research-pulse/shared';

export function WatchlistAlerts({ userId }: { userId: string }) {
  const [alerts, setAlerts] = useState<UserAlert[]>([]);
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data } = await supabase
        .from('user_alerts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (mounted) setAlerts((data ?? []) as UserAlert[]);
    }
    load();

    const ch = supabase
      .channel(`watchlist-alerts:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_alerts',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => setAlerts((prev) => [payload.new as UserAlert, ...prev]),
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [userId, supabase]);

  async function markAllRead() {
    const now = new Date().toISOString();
    await supabase.from('user_alerts').update({ read_at: now }).eq('user_id', userId).is('read_at', null);
    setAlerts((prev) => prev.map((a) => (a.read_at ? a : { ...a, read_at: now })));
  }

  const unread = alerts.filter((a) => !a.read_at);

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">
          Alerts
          {unread.length > 0 && (
            <span className="ml-2 rounded-full bg-accent-500 px-2 py-0.5 text-[10px] text-white">
              {unread.length} new
            </span>
          )}
        </h2>
        {unread.length > 0 && (
          <button onClick={markAllRead} className="text-xs text-white/60 hover:text-white">
            Mark all read
          </button>
        )}
      </div>
      {alerts.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white/60">
          No alerts yet. Star papers to track them — you'll be notified when their GitHub stars surge.
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => (
            <AlertRow key={a.id} alert={a} />
          ))}
        </div>
      )}
    </section>
  );
}

function AlertRow({ alert }: { alert: UserAlert }) {
  const payload = alert.payload as { stars_gained?: number; ratio?: number | null };
  return (
    <Link
      href={`/paper/${encodeURIComponent(alert.arxiv_id)}`}
      className={`flex items-center justify-between rounded-md border border-white/10 p-3 text-sm transition hover:border-accent-500/50 ${
        alert.read_at ? 'bg-white/5' : 'bg-accent-500/10'
      }`}
    >
      <div>
        <div className="font-mono text-xs text-white/50">{alert.arxiv_id}</div>
        <div>
          {alert.alert_type === 'star_surge' ? (
            <>
              🔥 Star surge — <strong>+{payload.stars_gained}</strong> stars in 1h
              {payload.ratio && Number.isFinite(payload.ratio) && (
                <span className="text-white/60"> ({payload.ratio}× baseline)</span>
              )}
            </>
          ) : (
            alert.alert_type
          )}
        </div>
      </div>
      <div className="text-xs text-white/40">{formatRelative(alert.created_at)}</div>
    </Link>
  );
}
