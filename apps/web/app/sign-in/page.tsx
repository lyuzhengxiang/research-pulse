import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SignInForm } from '@/components/SignInForm';

export const dynamic = 'force-dynamic';

export default async function SignInPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/');

  return (
    <div className="mx-auto max-w-[480px] px-9 pb-9 pt-9">
      <header className="border-b-[3px] border-double border-ink-rule pb-3 text-center">
        <div className="font-mono text-ticker uppercase tracking-kicker text-almanac-red">
          Form 100-A · Subscriber Application
        </div>
        <h1 className="mt-1 font-serif text-page-title font-bold tracking-lead">
          Apply for Subscription
        </h1>
        <div className="mt-0.5 font-serif italic text-[14px]">
          « We shall send a key to your address by the next post. »
        </div>
      </header>
      <SignInForm />
    </div>
  );
}
