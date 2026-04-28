import { createClient } from '@/lib/supabase/server';
import { fetchInitialTelegrams } from '@/lib/telegrams';
import { AlmanacBroadsheet } from '@/components/AlmanacBroadsheet';
import type { Paper, UserSubscription } from '@research-pulse/shared';

export const dynamic = 'force-dynamic';

async function fetchFeedForUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string | null,
): Promise<Paper[]> {
  if (!userId) {
    const { data } = await supabase
      .from('papers')
      .select('*')
      .order('pulse_score', { ascending: false })
      .order('published_at', { ascending: false })
      .limit(30);
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
      .limit(30);
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
    .limit(30);

  return (data ?? []) as Paper[];
}

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [papers, telegrams] = await Promise.all([
    fetchFeedForUser(supabase, user?.id ?? null),
    fetchInitialTelegrams(supabase, user?.id ?? null),
  ]);

  const kicker = user ? '— from your standing orders —' : '— for the general reader —';
  const strapline = user
    ? 'Today’s papers, ranked by the velocity of the wires you have asked us to watch.'
    : 'Today’s papers, ranked by velocity across the wires.';

  return (
    <AlmanacBroadsheet
      kicker={kicker}
      title="The Front Page"
      strapline={strapline}
      papers={papers}
      initialTelegrams={telegrams}
      userId={user?.id ?? null}
    />
  );
}
