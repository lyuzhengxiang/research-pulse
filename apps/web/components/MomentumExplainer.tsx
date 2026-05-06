'use client';

import { useEffect, useRef, useState } from 'react';

export function MomentumExplainer() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span ref={wrapRef} className="relative inline-block align-baseline not-italic">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="cursor-help font-serif italic text-ink underline decoration-dotted decoration-ink-mute underline-offset-[3px] hover:decoration-ink"
      >
        momentum
      </button>
      {open && (
        <span
          role="dialog"
          aria-label="How pulse score is calculated"
          className="absolute left-1/2 top-full z-50 mt-2 w-[min(380px,calc(100vw-32px))] -translate-x-1/2 border border-ink-rule bg-paper-2 px-4 py-3.5 text-left shadow-[0_8px_24px_rgba(31,26,20,0.18)]"
        >
          <span className="block font-mono text-ticker uppercase tracking-kicker text-almanac-red">
            How pulse is ranked
          </span>
          <span className="mt-2 block font-mono text-meta text-ink">
            pulse = stars × 1 / (1 + log₁₀ daysOld)
          </span>
          <span className="mt-2 block font-serif italic text-[14px] leading-snug text-ink-mute">
            GitHub stars on the paper&rsquo;s official repo, decayed by time since arXiv submission. Fresh papers (&lt; 6h) get a ~2.5× boost; the multiplier reaches 1.0 at 1 day and ~0.5 at a week. Hacker News signals are omitted &mdash; coverage is too sparse to rank across the corpus.
          </span>
        </span>
      )}
    </span>
  );
}
