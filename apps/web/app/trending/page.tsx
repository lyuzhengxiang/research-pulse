import { createClient } from '@/lib/supabase/server';
import { fetchInitialTelegrams } from '@/lib/telegrams';
import { AlmanacBroadsheet } from '@/components/AlmanacBroadsheet';
import type { Paper } from '@research-pulse/shared';

export const dynamic = 'force-dynamic';

export default async function TrendingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data }, telegrams] = await Promise.all([
    supabase
      .from('papers')
      .select('*')
      .eq('is_active', true)
      .order('pulse_score', { ascending: false })
      .order('published_at', { ascending: false })
      .limit(40),
    fetchInitialTelegrams(supabase, user?.id ?? null),
  ]);
  const papers = (data ?? []) as Paper[];

  return (
    <AlmanacBroadsheet
      kicker="— in circulation —"
      title="In Circulation"
      strapline="The papers presently most read across the wires, regardless of subscription."
      papers={papers}
      initialTelegrams={telegrams}
      userId={user?.id ?? null}
    />
  );
}
