'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { UserAlert } from '@research-pulse/shared';

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay =
    d.getUTCFullYear() === today.getUTCFullYear() &&
    d.getUTCMonth() === today.getUTCMonth() &&
    d.getUTCDate() === today.getUTCDate();
  const time = `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
  return sameDay
    ? `Today, ${time}`
    : `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}, ${time}`;
}

function alertCopy(a: UserAlert): string {
  const payload = (a.payload ?? {}) as { stars_gained?: number; ratio?: number };
  if (a.alert_type === 'star_surge') {
    const gained = payload.stars_gained ?? 0;
    const ratio = payload.ratio;
    return `+${gained} ★ in 1h${ratio ? `, ${ratio}× baseline velocity` : ''}`;
  }
  if (a.alert_type === 'new_hn_discussion') return 'New discussion on Hacker News';
  if (a.alert_type === 'new_match') return 'New paper matches your subscriptions';
  return a.alert_type;
}

export function Dispatches({
  initial,
  userId,
  paperTitles,
}: {
  initial: UserAlert[];
  userId: string;
  paperTitles: Record<string, string>;
}) {
  const [alerts, setAlerts] = useState<UserAlert[]>(initial);
  const [titles, setTitles] = useState<Record<string, string>>(paperTitles);
  const supabase = createClient();

  useEffect(() => {
    const ch = supabase
      .channel(`dispatches:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_alerts',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const a = payload.new as UserAlert;
          setAlerts((prev) => [a, ...prev].slice(0, 30));
          if (!titles[a.arxiv_id]) {
            const { data } = await supabase
              .from('papers')
              .select('arxiv_id,title')
              .eq('arxiv_id', a.arxiv_id)
              .maybeSingle();
            if (data) {
              setTitles((prev) => ({ ...prev, [data.arxiv_id]: data.title }));
            }
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, titles, userId]);

  async function acknowledge(id: number) {
    const now = new Date().toISOString();
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read_at: now } : a)));
    await supabase.from('user_alerts').update({ read_at: now }).eq('id', id);
  }

  async function dismiss(id: number) {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    await supabase.from('user_alerts').delete().eq('id', id);
  }

  async function acknowledgeAll() {
    const ids = alerts.filter((a) => !a.read_at).map((a) => a.id);
    if (ids.length === 0) return;
    const now = new Date().toISOString();
    setAlerts((prev) => prev.map((a) => (a.read_at ? a : { ...a, read_at: now })));
    await supabase.from('user_alerts').update({ read_at: now }).in('id', ids);
  }

  if (alerts.length === 0) {
    return (
      <div className="font-serif italic text-[14px] text-ink-mute">
        — no notifications yet —
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-end">
        <button
          onClick={acknowledgeAll}
          className="font-mono text-ticker uppercase tracking-mono-uc text-ink-mute hover:text-almanac-red"
        >
          mark all read ↗
        </button>
      </div>
      <ol className="m-0 list-none p-0">
        {alerts.map((a) => {
          const title = titles[a.arxiv_id];
          const unread = !a.read_at;
          return (
            <li key={a.id} className="border-b border-dotted border-ink-rule py-2.5">
              <div className="font-mono text-ticker text-ink-mute">
                {fmtWhen(a.created_at)}
                {unread && (
                  <span className="ml-2 font-bold text-almanac-red">· new</span>
                )}
              </div>
              <Link
                href={`/paper/${encodeURIComponent(a.arxiv_id)}`}
                className="almanac-link block"
              >
                <div className="mt-0.5 font-serif text-[15px] font-semibold leading-tight">
                  {title ?? a.arxiv_id}
                </div>
              </Link>
              <div className="mt-0.5 font-serif italic text-[13px] text-[#3a342b]">
                — {alertCopy(a)}
              </div>
              <div className="mt-1 font-mono text-ticker text-ink-mute">
                <button
                  onClick={() => acknowledge(a.id)}
                  className="hover:text-ink"
                  disabled={!unread}
                >
                  [ {unread ? 'mark read' : 'read'} ]
                </button>
                <span className="mx-2">·</span>
                <button onClick={() => dismiss(a.id)} className="hover:text-almanac-red">
                  [ dismiss ]
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="mt-3 text-center font-serif italic text-[13px] text-ink-mute">
        — end of notifications —
      </div>
    </div>
  );
}
