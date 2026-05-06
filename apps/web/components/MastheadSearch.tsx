'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const ARXIV_RE = /^\d{4}\.\d{4,5}(?:v\d+)?$/;

export function MastheadSearch() {
  const [q, setQ] = useState('');
  const router = useRouter();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    if (!trimmed) return;
    if (ARXIV_RE.test(trimmed)) {
      router.push(`/paper/${encodeURIComponent(trimmed)}`);
    } else {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      role="search"
      className="mt-2 flex justify-center"
    >
      <div className="flex w-full max-w-[440px] items-center gap-2 border border-ink-rule bg-paper-2 px-3 py-1.5">
        <span className="font-mono text-meta text-ink-mute" aria-hidden>⌕</span>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="arxiv id or topic…"
          aria-label="Search papers"
          className="flex-1 bg-transparent font-mono text-meta text-ink placeholder:text-ink-mute focus:outline-none"
        />
        <button
          type="submit"
          className="font-mono text-ticker uppercase tracking-mono-uc text-almanac-red hover:text-ink"
        >
          go ↗
        </button>
      </div>
    </form>
  );
}
