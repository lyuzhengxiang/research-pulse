import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <div className="mb-2 text-xs uppercase tracking-[0.25em] text-ink-dim">
        $ curl: error (404)
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        <span className="text-danger">not_found:</span> no such resource
      </h1>
      <p className="mt-2 text-sm text-ink-dim">
        the paper or page you're looking for doesn't exist.
      </p>
      <Link
        href="/"
        className="mt-5 inline-block border border-border bg-bg-surface px-4 py-1.5 text-sm text-ink-dim transition hover:text-up hover:border-up/50"
      >
        ◀ back to feed
      </Link>
    </div>
  );
}
