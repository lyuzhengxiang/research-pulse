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
    <div className="space-y-6 text-[13px]">
      <section className="border-b border-border pb-3">
        <div className="mb-0.5 text-[10px] uppercase tracking-[0.25em] text-ink-muted">
          $ watchlist --alerts --papers
        </div>
        <h1 className="text-ink">
          <span className="text-ink-muted">//</span> your watchlist
        </h1>
        <p className="text-[11px] text-ink-dim">
          papers you're tracking · alerts fire when a GH-star surge is detected
        </p>
      </section>

      <WatchlistAlerts userId={user.id} />

      <section className="space-y-2">
        <div className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">
          // tracked papers <span className="text-ink">({papers.length})</span>
        </div>
        {papers.length === 0 ? (
          <div className="border border-border bg-bg-surface/60 p-5 text-[12px] text-ink-dim">
            not tracking anything yet. open a paper and hit <span className="text-up">○ track</span>.
          </div>
        ) : (
          <div className="space-y-1.5">
            {papers.map((p) => (
              <PulseCard key={p.arxiv_id} paper={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
