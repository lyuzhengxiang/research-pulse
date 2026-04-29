import { createClient } from '@/lib/supabase/server';
import { fetchInitialTelegrams } from '@/lib/telegrams';
import { AlmanacBroadsheet } from '@/components/AlmanacBroadsheet';
import { fetchPapersPage, PAGE_SIZE } from '@/lib/papers';

export const dynamic = 'force-dynamic';

export default async function TrendingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [papers, telegrams] = await Promise.all([
    fetchPapersPage('trending', user?.id ?? null, 0, PAGE_SIZE),
    fetchInitialTelegrams(supabase, user?.id ?? null),
  ]);

  return (
    <AlmanacBroadsheet
      kicker="— trending now —"
      title="Trending"
      strapline="The hottest papers across all topics right now, regardless of your subscriptions."
      papers={papers}
      initialTelegrams={telegrams}
      userId={user?.id ?? null}
      scope="trending"
    />
  );
}
