import 'server-only';
import type { Paper, UserSubscription } from '@research-pulse/shared';
import { createClient } from '@/lib/supabase/server';

export type FeedScope = 'feed' | 'trending';

type Supa = Awaited<ReturnType<typeof createClient>>;

export const PAGE_SIZE = 30;

async function fetchTrending(
  supabase: Supa,
  offset: number,
  limit: number,
): Promise<Paper[]> {
  const { data } = await supabase
    .from('papers')
    .select('*')
    .eq('is_active', true)
    .order('pulse_score', { ascending: false })
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1);
  return (data ?? []) as Paper[];
}

async function fetchFeed(
  supabase: Supa,
  userId: string | null,
  offset: number,
  limit: number,
): Promise<Paper[]> {
  if (!userId) {
    const { data } = await supabase
      .from('papers')
      .select('*')
      .order('pulse_score', { ascending: false })
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);
    return (data ?? []) as Paper[];
  }

  const { data: subs } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId);
  const subscriptions = (subs ?? []) as UserSubscription[];

  const keywords = subscriptions.filter((s) => s.sub_type === 'keyword').map((s) => s.value);
  const authors = subscriptions.filter((s) => s.sub_type === 'author').map((s) => s.value);
  const categories = subscriptions.filter((s) => s.sub_type === 'category').map((s) => s.value);

  if (!keywords.length && !authors.length && !categories.length) {
    const { data } = await supabase
      .from('papers')
      .select('*')
      .order('pulse_score', { ascending: false })
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);
    return (data ?? []) as Paper[];
  }

  const orFilters: string[] = [];
  for (const cat of categories) orFilters.push(`categories.cs.{${cat}}`);
  for (const kw of keywords) {
    const safe = kw.replace(/[%,]/g, '');
    orFilters.push(`title.ilike.%${safe}%`);
    orFilters.push(`abstract.ilike.%${safe}%`);
  }
  for (const a of authors) orFilters.push(`authors.cs.{${a}}`);

  const { data } = await supabase
    .from('papers')
    .select('*')
    .or(orFilters.join(','))
    .order('pulse_score', { ascending: false })
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return (data ?? []) as Paper[];
}

export async function fetchPapersPage(
  scope: FeedScope,
  userId: string | null,
  offset: number,
  limit: number = PAGE_SIZE,
): Promise<Paper[]> {
  const supabase = await createClient();
  if (scope === 'trending') return fetchTrending(supabase, offset, limit);
  return fetchFeed(supabase, userId, offset, limit);
}
