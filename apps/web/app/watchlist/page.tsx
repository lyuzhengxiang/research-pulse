import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PulseCard } from '@/components/PulseCard';
import { WatchlistAlerts } from '@/components/WatchlistAlerts';
import type { Paper } from '@research-pulse/shared';

export const dynamic = 'force-dynamic';

export default async function WatchlistPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const { data: starredRows } = await supabase
    .from('user_starred_papers')
    .select('arxiv_id')
    .eq('user_id', user.id);
  const starredIds = (starredRows ?? []).map((r) => r.arxiv_id);

  let papers: Paper[] = [];
  if (starredIds.length > 0) {
    const { data } = await supabase.from('papers').select('*').in('arxiv_id', starredIds);
    papers = (data ?? []) as Paper[];
  }

  return (
    <div className="space-y-7">
      <section className="border-b border-border pb-4">
        <div className="mb-1.5 text-xs uppercase tracking-[0.25em] text-ink-dim">
          $ watchlist --alerts --papers
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          <span className="text-ink-muted">//</span> your watchlist
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          papers you're tracking. alerts fire when a tracked paper's GH★ surges.
        </p>
      </section>

      <WatchlistAlerts userId={user.id} />

      <section className="space-y-2">
        <div className="text-xs uppercase tracking-[0.2em] text-ink-dim">
          // tracked papers <span className="text-ink">({papers.length})</span>
        </div>
        {papers.length === 0 ? (
          <div className="border border-border bg-bg-surface p-5 text-sm text-ink-dim">
            not tracking anything yet. open a paper and hit <span className="text-up">○ track</span>.
          </div>
        ) : (
          <div className="space-y-2">
            {papers.map((p) => (
              <PulseCard key={p.arxiv_id} paper={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
