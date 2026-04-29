'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export function AlertBell({ userId }: { userId: string }) {
  const [unread, setUnread] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { count } = await supabase
        .from('user_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('read_at', null);
      if (mounted) setUnread(count ?? 0);
    }
    load();

    const ch = supabase
      .channel(`alerts:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_alerts', filter: `user_id=eq.${userId}` },
        () => setUnread((c) => c + 1),
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [userId, supabase]);

  return (
    <Link
      href="/watchlist"
      aria-label={`Notifications: ${unread} unread`}
      className="text-ink hover:text-almanac-red"
      style={{ fontSize: 11 }}
    >
      <span style={{ color: unread > 0 ? '#b1342a' : '#6b6055' }}>✉</span>{' '}
      <span>{unread > 0 ? `${unread > 9 ? '9+' : unread} new` : 'no new'}</span>
    </Link>
  );
}
