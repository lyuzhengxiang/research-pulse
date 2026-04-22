import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PulseCard } from '@/components/PulseCard';
import { WatchlistAlerts } from '@/components/WatchlistAlerts';
import type { Paper } from '@research-pulse/shared';

export const dynamic = 'force-dynamic';

export default async function WatchlistPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const [starredRes, papersRes] = await Promise.all([
    supabase.from('user_starred_papers').select('arxiv_id, starred_at').eq('user_id', user.id),
    supabase
      .from('papers')
      .select('*')
      .in(
        'arxiv_id',
        (
          await supabase.from('user_starred_papers').select('arxiv_id').eq('user_id', user.id)
        ).data?.map((r) => r.arxiv_id) ?? [],
      ),
  ]);
  const papers = (papersRes.data ?? []) as Paper[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">📌 Your watchlist</h1>
        <p className="text-sm text-white/60">
          Papers you've starred + any star-surge alerts they triggered.
        </p>
      </div>

      <WatchlistAlerts userId={user.id} />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">
          Starred papers ({papers.length})
        </h2>
        {papers.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-sm text-white/60">
            You haven't starred any papers yet. Open a paper and hit ☆ Star.
          </div>
        ) : (
          <div className="grid gap-3">
            {papers.map((p) => (
              <PulseCard key={p.arxiv_id} paper={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
