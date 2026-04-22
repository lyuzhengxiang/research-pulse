import { createClient } from '@/lib/supabase/server';
import { PulseCard } from '@/components/PulseCard';
import type { Paper } from '@research-pulse/shared';

export const dynamic = 'force-dynamic';

export default async function TrendingPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('papers')
    .select('*')
    .eq('is_active', true)
    .order('pulse_score', { ascending: false })
    .limit(40);
  const papers = (data ?? []) as Paper[];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">🔥 Trending right now</h1>
        <p className="text-sm text-white/60">
          Ranked by pulse score — weighted velocity of GitHub stars + HN discussion over the last 24h.
        </p>
      </div>
      {papers.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center text-white/60">
          No active papers yet.
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
