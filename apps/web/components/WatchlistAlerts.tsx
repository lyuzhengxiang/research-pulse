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
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em]">
        <div className="text-ink-dim">
          // alerts
          {unread.length > 0 && (
            <span className="ml-2 bg-warn/20 px-2 py-0.5 text-warn">
              {unread.length} unread
            </span>
          )}
        </div>
        {unread.length > 0 && (
          <button onClick={markAllRead} className="text-ink-dim transition hover:text-ink">
            mark_all_read ↗
          </button>
        )}
      </div>
      {alerts.length === 0 ? (
        <div className="border border-border bg-bg-surface p-4 text-sm text-ink-dim">
          no alerts. track a paper — you'll be notified when its GH★ surges.
        </div>
      ) : (
        <div className="space-y-1">
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
  const unread = !alert.read_at;
  return (
    <Link
      href={`/paper/${encodeURIComponent(alert.arxiv_id)}`}
      className={`flex items-center justify-between border-l-2 px-3 py-2.5 text-sm transition ${
        unread
          ? 'border-l-danger bg-danger/5 hover:bg-danger/10'
          : 'border-l-border bg-bg-surface/40 hover:bg-bg-raised'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className={unread ? 'text-danger' : 'text-ink-muted'}>
          {unread ? '●' : '○'}
        </span>
        <span className="text-ink-muted">{alert.arxiv_id}</span>
        <span className="text-ink">
          {alert.alert_type === 'star_surge' ? (
            <>
              <span className="text-danger">STAR_SURGE</span>{' '}
              +<span className="tabular-nums text-up">{payload.stars_gained}</span>
              {payload.ratio && (
                <span className="text-ink-dim"> · {payload.ratio}× baseline</span>
              )}
            </>
          ) : (
            alert.alert_type
          )}
        </span>
      </div>
      <span className="text-xs text-ink-muted">{formatRelative(alert.created_at)}</span>
    </Link>
  );
}
