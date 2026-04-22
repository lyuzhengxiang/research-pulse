import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SignInForm } from '@/components/SignInForm';

export const dynamic = 'force-dynamic';

export default async function SignInPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/');

  return (
    <div className="mx-auto max-w-md space-y-4 py-10 text-[13px]">
      <div>
        <div className="mb-0.5 text-[10px] uppercase tracking-[0.25em] text-ink-muted">
          $ auth --magic-link
        </div>
        <h1 className="text-ink">
          <span className="text-ink-muted">//</span> authenticate
        </h1>
        <p className="text-[11px] text-ink-dim">
          we'll email you a magic link. no password needed.
        </p>
      </div>
      <SignInForm />
    </div>
  );
}
