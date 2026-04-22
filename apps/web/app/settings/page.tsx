import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SubscriptionManager } from '@/components/SubscriptionManager';
import type { UserSubscription } from '@research-pulse/shared';

export const dynamic = 'force-dynamic';

const AVAILABLE_CATEGORIES = ['cs.AI', 'cs.LG', 'cs.CL', 'cs.CV', 'stat.ML'];

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const [{ data: subs }, { data: trending }] = await Promise.all([
    supabase.from('user_subscriptions').select('*').eq('user_id', user.id),
    supabase.from('trending_keywords').select('word').limit(60),
  ]);
  const subscriptions = (subs ?? []) as UserSubscription[];
  const suggestedKeywords = (trending ?? []).map((r) => r.word as string);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">⚙️ Subscriptions</h1>
        <p className="text-sm text-white/60">
          Tune what shows up in your feed. Start with a category and a few keywords.
        </p>
      </div>
      <SubscriptionManager
        userId={user.id}
        initialSubscriptions={subscriptions}
        availableCategories={AVAILABLE_CATEGORIES}
        suggestedKeywords={suggestedKeywords}
      />
    </div>
  );
}
