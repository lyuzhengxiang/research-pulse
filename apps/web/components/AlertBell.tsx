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
    <Link href="/watchlist" className="relative">
      <span className="text-white/70 hover:text-white" aria-label="Alerts">🔔</span>
      {unreadCount > 0 && (
        <span className="absolute -right-2 -top-2 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
