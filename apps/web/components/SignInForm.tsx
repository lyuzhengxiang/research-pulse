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
      <div className="border border-up/30 bg-up/5 p-4 text-sm text-ink">
        <div className="mb-1 text-xs uppercase tracking-[0.2em] text-up">→ sent</div>
        magic link sent to <span className="text-up">{email}</span>. check your inbox.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-ink-dim">$</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@university.edu"
          className="flex-1 border border-border bg-bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-up focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full border border-up/60 bg-up/10 px-3 py-2 text-sm tracking-wider text-up transition hover:bg-up/20 disabled:opacity-40"
      >
        {status === 'sending' ? 'SENDING…' : '→ SEND MAGIC LINK'}
      </button>
      {status === 'error' && (
        <p className="text-sm text-danger">
          <span className="text-ink-muted">err:</span> {errorMsg}
        </p>
      )}
    </form>
  );
}
