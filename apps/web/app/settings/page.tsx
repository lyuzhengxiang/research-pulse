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
    <div className="space-y-5 text-[13px]">
      <section className="border-b border-border pb-3">
        <div className="mb-0.5 text-[10px] uppercase tracking-[0.25em] text-ink-muted">
          $ config --user={user.email}
        </div>
        <h1 className="text-ink">
          <span className="text-ink-muted">//</span> subscriptions
        </h1>
        <p className="text-[11px] text-ink-dim">
          tune your feed. start with a category and a few keywords.
        </p>
      </section>
      <SubscriptionManager
        userId={user.id}
        initialSubscriptions={subscriptions}
        availableCategories={AVAILABLE_CATEGORIES}
        suggestedKeywords={suggestedKeywords}
      />
    </div>
  );
}
