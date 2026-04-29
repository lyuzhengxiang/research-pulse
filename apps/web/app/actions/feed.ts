'use server';

import type { Paper } from '@research-pulse/shared';
import { createClient } from '@/lib/supabase/server';
import { fetchPapersPage, type FeedScope, PAGE_SIZE } from '@/lib/papers';

export async function loadMorePapers(
  scope: FeedScope,
  offset: number,
): Promise<Paper[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return fetchPapersPage(scope, user?.id ?? null, offset, PAGE_SIZE);
}
