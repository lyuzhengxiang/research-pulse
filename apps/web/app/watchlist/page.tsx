import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StarredLedger } from '@/components/StarredLedger';
import { Dispatches } from '@/components/Dispatches';
import type { Paper, PaperMetric, UserAlert } from '@research-pulse/shared';

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
  let metricsByArxiv: Record<string, PaperMetric[]> = {};
  if (starredIds.length > 0) {
    const [{ data: paperRows }, { data: metricRows }] = await Promise.all([
      supabase.from('papers').select('*').in('arxiv_id', starredIds),
      supabase
        .from('paper_metrics')
        .select('*')
        .in('arxiv_id', starredIds)
        .order('recorded_at', { ascending: true }),
    ]);
    papers = ((paperRows ?? []) as Paper[]).sort(
      (a, b) => b.pulse_score - a.pulse_score,
    );
    metricsByArxiv = ((metricRows ?? []) as PaperMetric[]).reduce<Record<string, PaperMetric[]>>(
      (acc, m) => {
        (acc[m.arxiv_id] ||= []).push(m);
        return acc;
      },
      {},
    );
  }

  const { data: alertRows } = await supabase
    .from('user_alerts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);
  const alerts = (alertRows ?? []) as UserAlert[];

  const titlesById: Record<string, string> = Object.fromEntries(
    papers.map((p) => [p.arxiv_id, p.title]),
  );
  const missingTitleIds = alerts
    .map((a) => a.arxiv_id)
    .filter((id) => !titlesById[id]);
  if (missingTitleIds.length > 0) {
    const { data } = await supabase
      .from('papers')
      .select('arxiv_id,title')
      .in('arxiv_id', Array.from(new Set(missingTitleIds)));
    for (const row of (data ?? []) as Array<{ arxiv_id: string; title: string }>) {
      titlesById[row.arxiv_id] = row.title;
    }
  }

  const handle = user.email?.split('@')[0] ?? 'reader';
  const unreadCount = alerts.filter((a) => !a.read_at).length;
  const notifSentence =
    unreadCount === 0
      ? 'no new notifications'
      : unreadCount === 1
      ? '1 new notification'
      : `${unreadCount} new notifications`;

  return (
    <div className="mx-auto max-w-[1080px] px-10 pb-8 pt-5">
      <header className="border-b border-ink-rule pb-2.5 text-center">
        <div className="font-mono text-ticker uppercase tracking-kicker text-ink-mute">
          Signed in as
        </div>
        <div className="mt-0.5 font-serif text-subscriber font-bold tracking-lead">
          {handle}
        </div>
        <div className="mt-0.5 font-serif italic text-[16px]">
          {papers.length === 0
            ? 'no starred papers yet'
            : `${papers.length} starred paper${papers.length === 1 ? '' : 's'}`}{' '}
          · {notifSentence}
        </div>
      </header>

      <div className="mt-5 grid grid-cols-[1.2fr_1fr] gap-9">
        <section>
          <div className="border-b border-ink-rule pb-1 font-mono text-ticker uppercase tracking-kicker">
            ★ Your Starred Papers
          </div>
          <StarredLedger papers={papers} metricsByArxiv={metricsByArxiv} />
        </section>

        <aside>
          <div className="border-b border-ink-rule pb-1 font-mono text-ticker uppercase tracking-kicker text-almanac-red">
            ✉ Notifications
          </div>
          <div className="mt-2">
            <Dispatches initial={alerts} userId={user.id} paperTitles={titlesById} />
          </div>
        </aside>
      </div>
    </div>
  );
}
