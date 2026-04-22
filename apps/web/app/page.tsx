import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PulseCard } from '@/components/PulseCard';
import type { Paper, UserSubscription } from '@research-pulse/shared';

export const dynamic = 'force-dynamic';

async function fetchFeedForUser(userId: string | null): Promise<Paper[]> {
  const supabase = await createClient();

  if (!userId) {
    const { data } = await supabase
      .from('papers')
      .select('*')
      .order('pulse_score', { ascending: false })
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
    .limit(30);

  return (data ?? []) as Paper[];
}

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const papers = await fetchFeedForUser(user?.id ?? null);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {user ? 'Your Feed' : 'Recent papers'}
          </h1>
          <p className="text-sm text-white/60">
            {user
              ? 'Filtered by your keyword, author, and category subscriptions.'
              : 'Sign in to personalize with keywords, authors, and categories.'}
          </p>
        </div>
        {user && (
          <Link href="/settings" className="text-sm text-accent-400 hover:text-accent-300">
            Manage subscriptions →
          </Link>
        )}
      </div>

      {papers.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center text-white/60">
          No matching papers yet. The worker polls arXiv every 30 minutes.
        </div>
      ) : (
        <div className="grid gap-3">
          {papers.map((p) => (
            <PulseCard key={p.arxiv_id} paper={p} />
          ))}
        </div>
      )}
    </div>
  );
}
