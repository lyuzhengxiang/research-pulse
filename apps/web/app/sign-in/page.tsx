import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SignInForm } from '@/components/SignInForm';

export const dynamic = 'force-dynamic';

export default async function SignInPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/');

  return (
    <div className="mx-auto max-w-md space-y-5 py-12">
      <div>
        <div className="mb-1.5 text-xs uppercase tracking-[0.25em] text-ink-dim">
          $ auth --magic-link
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          <span className="text-ink-muted">//</span> authenticate
        </h1>
        <p className="mt-1 text-sm text-ink-dim">
          we'll email you a magic link. no password needed.
        </p>
      </div>
      <SignInForm />
    </div>
  );
}
