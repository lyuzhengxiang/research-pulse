'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function SignInForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const supabase = createClient();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setErrorMsg(error.message);
      setStatus('error');
    } else {
      setStatus('sent');
    }
  }

  if (status === 'sent') {
    return (
      <div className="mt-6 border border-ink-rule bg-paper-2 p-4 text-center font-serif italic text-[17px]">
        A magic link has been emailed to{' '}
        <span className="font-semibold not-italic text-almanac-red">{email}</span>. Open the message and click the link to sign in.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3.5">
      <label className="block">
        <div className="mb-1.5 font-mono text-ticker uppercase tracking-mono-uc text-ink-mute">
          Email address
        </div>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full border border-ink-rule bg-transparent px-3 py-2 font-serif text-[17px] text-ink placeholder:text-ink-mute focus:outline-none focus:border-almanac-red"
        />
      </label>
      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full font-mono text-meta uppercase tracking-[0.2em] disabled:opacity-50"
        style={{
          background: '#1f1a14',
          color: '#f1ece1',
          padding: '10px 22px',
          borderRadius: 0,
        }}
      >
        {status === 'sending' ? 'SENDING…' : 'SEND MAGIC LINK ▶'}
      </button>
      {status === 'error' && (
        <p className="font-serif italic text-[15px] text-almanac-red">
          Something went wrong: {errorMsg}
        </p>
      )}
      <p className="pt-2 text-center font-serif italic text-meta text-ink-mute">
        Same form for new and returning users — just enter your email.
      </p>
    </form>
  );
}
