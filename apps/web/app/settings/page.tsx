import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SubscriptionManager } from '@/components/SubscriptionManager';
import type { UserSubscription } from '@research-pulse/shared';

export const dynamic = 'force-dynamic';

const AVAILABLE_CATEGORIES = ['cs.AI', 'cs.LG', 'cs.CL', 'cs.CV', 'stat.ML'];

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const [{ data: subs }, { data: trending }] = await Promise.all([
    supabase.from('user_subscriptions').select('*').eq('user_id', user.id),
    supabase.from('trending_keywords').select('word').limit(60),
  ]);
  const subscriptions = (subs ?? []) as UserSubscription[];
  const suggestedKeywords = (trending ?? []).map((r) => r.word as string);

  return (
    <div className="mx-auto max-w-[920px] px-4 pb-8 pt-5 lg:px-[60px]">
      <header className="border-b-[3px] border-double border-ink-rule pb-2.5 text-center">
        <div className="font-mono text-ticker uppercase tracking-kicker text-almanac-red">
          Subscriptions
        </div>
        <h1 className="mt-1 font-serif text-page-title font-bold tracking-lead">
          Settings
        </h1>
        <div className="mt-0.5 font-serif italic text-[16px]">
          « Tell us what to put on your feed. Saved automatically. »
        </div>
      </header>

      <SubscriptionManager
        userId={user.id}
        email={user.email ?? 'reader@unknown'}
        initialSubscriptions={subscriptions}
        availableCategories={AVAILABLE_CATEGORIES}
        suggestedKeywords={suggestedKeywords}
      />
    </div>
  );
}
