'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

export function PaperViewTracker({ arxivId }: { arxivId: string }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    const supabase = createClient();
    void supabase.rpc('record_paper_view', { p_arxiv_id: arxivId });
  }, [arxivId]);

  return null;
}
