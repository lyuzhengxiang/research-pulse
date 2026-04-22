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
    .order('published_at', { ascending: false })
    .limit(40);
  const papers = (data ?? []) as Paper[];

  return (
    <div className="space-y-6">
      <section className="border-b border-border pb-4">
        <div className="mb-1.5 text-xs uppercase tracking-[0.25em] text-ink-dim">
          $ trending --window=24h --sort=velocity
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          <span className="text-ink-muted">//</span> hot right now
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          ranked by pulse score — weighted velocity of GH★ + HN·pts + HN·cmts over last 24h.
        </p>
      </section>
      {papers.length === 0 ? (
        <div className="border border-border bg-bg-surface p-6 text-center text-sm text-ink-dim">
          <span className="animate-blink mr-2">▊</span>
          no active papers yet
        </div>
      ) : (
        <div className="space-y-2">
          {papers.map((p) => (
            <PulseCard key={p.arxiv_id} paper={p} />
          ))}
        </div>
      )}
    </div>
  );
}
