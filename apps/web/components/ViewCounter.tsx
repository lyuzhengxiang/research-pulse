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

    if (!fired.current) {
      fired.current = true;
      void supabase.rpc('record_paper_view', { p_arxiv_id: arxivId });
    }

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
          if (typeof v === 'number') setCount(v);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(ch);
    };
  }, [arxivId]);

  return <> · {count.toLocaleString()} viewed</>;
}
