'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { generateSummary } from '@/app/paper/[arxivId]/actions';

export function GenerateSummaryButton({
  arxivId,
  initialTldr,
  signedIn,
}: {
  arxivId: string;
  initialTldr: string | null;
  signedIn: boolean;
}) {
  const [tldr, setTldr] = useState<string | null>(initialTldr);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onClick() {
    setError(null);
    startTransition(async () => {
      const res = await generateSummary(arxivId);
      if (res.ok) setTldr(res.tldr);
      else setError(res.error);
    });
  }

  if (tldr) {
    return (
      <div className="relative mt-5 border border-ink-rule bg-paper-2 px-5 py-4">
        <div className="absolute left-4 -top-2.5 bg-paper px-2 font-mono text-ticker uppercase tracking-kicker text-almanac-red">
          Summary · gpt-5.4
        </div>
        <p className="m-0 font-serif italic text-pull-quote">&ldquo;{tldr}&rdquo;</p>
      </div>
    );
  }

  return (
    <div className="relative mt-5 border border-dashed border-ink-rule bg-paper-2 px-5 py-5 text-center">
      <div className="absolute left-4 -top-2.5 bg-paper px-2 font-mono text-ticker uppercase tracking-kicker text-ink-mute">
        Summary
      </div>
      <p className="m-0 mb-3 font-serif italic text-[14px] text-ink-mute">
        No summary yet. Generate a 2-3 sentence TLDR with gpt-5.4.
      </p>
      {signedIn ? (
        <button
          onClick={onClick}
          disabled={isPending}
          className="font-mono text-meta uppercase tracking-[0.2em] disabled:opacity-50"
          style={{
            background: '#1f1a14',
            color: '#f1ece1',
            padding: '8px 22px',
            borderRadius: 0,
          }}
        >
          {isPending ? 'GENERATING…' : '✨ GENERATE SUMMARY'}
        </button>
      ) : (
        <Link
          href="/sign-in"
          className="inline-block font-mono text-meta uppercase tracking-[0.2em]"
          style={{
            background: '#1f1a14',
            color: '#f1ece1',
            padding: '8px 22px',
            borderRadius: 0,
          }}
        >
          SIGN IN TO GENERATE ▶
        </Link>
      )}
      {error && (
        <p className="mt-2.5 font-serif italic text-[13px] text-almanac-red">{error}</p>
      )}
    </div>
  );
}
