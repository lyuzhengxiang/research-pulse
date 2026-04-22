'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export function AlertBell({ userId }: { userId: string }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;

    async function loadInitial() {
      const { count } = await supabase
        .from('user_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('read_at', null);
      if (mounted) setUnreadCount(count ?? 0);
    }
    loadInitial();

    const channel = supabase
      .channel(`alerts:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_alerts', filter: `user_id=eq.${userId}` },
        () => setUnreadCount((c) => c + 1),
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  return (
    <Link
      href="/watchlist"
      className="flex items-center gap-1 px-2 py-1 text-sm tracking-wider text-ink-dim transition hover:text-warn"
      aria-label={`Alerts: ${unreadCount} unread`}
    >
      <span className="ascii-bracket">ALERTS</span>
      <span className={unreadCount > 0 ? 'text-warn' : 'text-ink-muted'}>
        {unreadCount > 0 ? `·${unreadCount > 9 ? '9+' : unreadCount}` : '·0'}
      </span>
    </Link>
  );
}
