'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function ViewCounter({
  arxivId,
  initialCount,
}: {
  arxivId: string;
  initialCount: number;
}) {
  const [count, setCount] = useState(initialCount);
  const fired = useRef(false);

  useEffect(() => {
    const supabase = createClient();

    // Live updates from *other* visitors so the number ticks up while the
    // page is open.
    const ch = supabase
      .channel(`view-counter:${arxivId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'papers',
          filter: `arxiv_id=eq.${arxivId}`,
        },
        (payload) => {
          const v = (payload.new as { view_count?: number }).view_count;
          if (typeof v === 'number') setCount((c) => Math.max(c, v));
        },
      )
      .subscribe();

    // Fire the RPC ourselves, then re-read the row to reflect our own bump.
    // Doing it this way (instead of trusting realtime to echo our own UPDATE)
    // sidesteps a race: if the RPC commits before subscribe() finishes the
    // handshake, the broadcast is missed and the counter looks stuck.
    if (!fired.current) {
      fired.current = true;
      void (async () => {
        await supabase.rpc('record_paper_view', { p_arxiv_id: arxivId });
        const { data } = await supabase
          .from('papers')
          .select('view_count')
          .eq('arxiv_id', arxivId)
          .maybeSingle();
        const v = data?.view_count;
        if (typeof v === 'number') setCount((c) => Math.max(c, v));
      })();
    }

    return () => {
      void supabase.removeChannel(ch);
    };
  }, [arxivId]);

  return <> · {count.toLocaleString()} viewed</>;
}
