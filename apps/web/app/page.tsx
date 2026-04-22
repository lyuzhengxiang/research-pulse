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
    <div className="space-y-5 text-[13px]">
      <section className="flex items-end justify-between border-b border-border pb-3">
        <div>
          <div className="mb-0.5 text-[10px] uppercase tracking-[0.25em] text-ink-muted">
            $ feed --sort=pulse --limit=30
          </div>
          <h1 className="text-ink">
            <span className="text-ink-muted">//</span>{' '}
            {user ? 'your personalized feed' : 'latest papers'}
          </h1>
          <p className="text-[11px] text-ink-dim">
            {user
              ? 'filtered by keyword / author / category subscriptions · sorted by pulse velocity'
              : 'sign in to personalize with keyword / author / category subscriptions'}
          </p>
        </div>
        {user && (
          <Link
            href="/settings"
            className="border border-border bg-bg-surface/60 px-2.5 py-1 text-[11px] text-ink-dim transition hover:text-up hover:border-up/50"
          >
            ./config ↗
          </Link>
        )}
      </section>

      {papers.length === 0 ? (
        <div className="border border-border bg-bg-surface/60 p-6 text-center text-[12px] text-ink-dim">
          <span className="animate-blink mr-2">▊</span>
          no papers match. the worker polls arxiv every 30min.
        </div>
      ) : (
        <div className="space-y-1.5">
          {papers.map((p) => (
            <PulseCard key={p.arxiv_id} paper={p} />
          ))}
        </div>
      )}
    </div>
  );
}
