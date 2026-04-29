import { createClient } from '@/lib/supabase/server';
import { fetchInitialTelegrams } from '@/lib/telegrams';
import { AlmanacBroadsheet } from '@/components/AlmanacBroadsheet';
import { fetchPapersPage, PAGE_SIZE } from '@/lib/papers';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [papers, telegrams] = await Promise.all([
    fetchPapersPage('feed', user?.id ?? null, 0, PAGE_SIZE),
    fetchInitialTelegrams(supabase, user?.id ?? null),
  ]);

  const kicker = user ? '— from your subscriptions —' : '— top papers right now —';
  const strapline = user
    ? 'Top papers across the topics, authors, and keywords you follow.'
    : 'Top papers across AI/ML right now, ranked by momentum.';

  return (
    <AlmanacBroadsheet
      kicker={kicker}
      title="Your Feed"
      strapline={strapline}
      papers={papers}
      initialTelegrams={telegrams}
      userId={user?.id ?? null}
      scope="feed"
    />
  );
}
