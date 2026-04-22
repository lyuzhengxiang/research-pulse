import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="py-20 text-center text-[13px]">
      <div className="mb-1 text-[10px] uppercase tracking-[0.25em] text-ink-muted">
        $ curl: error (404)
      </div>
      <h1 className="text-ink">
        <span className="text-danger">not_found:</span> no such resource
      </h1>
      <p className="mt-2 text-[11px] text-ink-dim">
        the paper or page you're looking for doesn't exist.
      </p>
      <Link
        href="/"
        className="mt-4 inline-block border border-border bg-bg-surface/60 px-3 py-1 text-[11px] text-ink-dim transition hover:text-up hover:border-up/50"
      >
        ◀ back to feed
      </Link>
    </div>
  );
}
