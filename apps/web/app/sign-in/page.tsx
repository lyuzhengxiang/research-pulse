import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SignInForm } from '@/components/SignInForm';

export const dynamic = 'force-dynamic';

export default async function SignInPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/');

  return (
    <div className="mx-auto max-w-md space-y-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold">Sign in to Research Pulse</h1>
        <p className="text-sm text-white/60">
          We'll email you a magic link. No password needed.
        </p>
      </div>
      <SignInForm />
    </div>
  );
}
