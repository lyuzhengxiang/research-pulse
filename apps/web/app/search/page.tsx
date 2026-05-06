import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { Paper } from '@research-pulse/shared';

export const dynamic = 'force-dynamic';

function relativeAge(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h`;
  const d = Math.round(h / 24);
  return `${d}d`;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? '').trim();

  let results: Paper[] = [];
  let error: string | null = null;
  if (query) {
    const supabase = await createClient();
    const { data, error: rpcError } = await supabase.rpc('search_papers', {
      p_query: query,
      p_limit: 80,
    });
    if (rpcError) error = rpcError.message;
    results = (data ?? []) as Paper[];
  }

  return (
    <article className="mx-auto max-w-[1100px] px-4 pb-9 pt-5 lg:px-[60px]">
      <div className="mb-3.5">
        <Link
          href="/"
          className="font-mono text-meta tracking-[0.1em] hover:text-almanac-red"
          style={{ color: '#214a8a' }}
        >
          ◀ back to feed
        </Link>
      </div>

      <div className="mb-2 text-center font-mono text-ticker uppercase tracking-kicker text-almanac-red">
        ★ ★ ★ &nbsp;Index Lookup&nbsp; ★ ★ ★
      </div>

      <header className="border-y-[3px] border-double border-ink-rule px-0 py-3 text-center">
        <div className="border-t border-ink-rule pt-3 -mt-3" />
        <div className="font-mono text-ticker uppercase tracking-kicker text-ink-mute">
          {query ? 'search results' : 'search the index'}
        </div>
        <h1 className="my-1.5 font-serif text-[30px] font-bold tracking-mast leading-[1.05] sm:text-[40px] lg:text-title-xl lg:leading-[1.02]">
          {query ? `“${query}”` : 'Search the index'}
        </h1>
        <div className="font-serif italic text-[16px]">
          {query
            ? `${results.length} result${results.length === 1 ? '' : 's'}`
            : 'Type an arxiv id (e.g. 2604.12345) or a topic in the masthead search.'}
        </div>
      </header>

      {error && (
        <div className="py-10 text-center font-serif italic text-[16px] text-almanac-red">
          {error}
        </div>
      )}

      {query && !error && results.length === 0 && (
        <div className="py-16 text-center font-serif italic text-[18px] text-ink-mute">
          No matching papers. Try fewer or different terms.
        </div>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-1 gap-x-9 px-1 pt-4 lg:grid-cols-2 lg:px-0">
          {results.map((p, i) => (
            <Link
              key={p.arxiv_id}
              href={`/paper/${encodeURIComponent(p.arxiv_id)}`}
              className="almanac-link block"
            >
              <div className="grid grid-cols-[32px_1fr_auto] gap-2 border-b border-dotted border-ink-rule py-2.5">
                <div className="font-serif text-[24px] font-bold leading-none text-almanac-red">
                  {i % 4 === 0 ? '§' : '·'}
                </div>
                <div>
                  <div className="font-serif text-list font-semibold leading-snug">
                    {p.title}
                  </div>
                  <div className="mt-0.5 font-mono text-ticker text-ink-mute">
                    {p.primary_category} · {p.authors[0] ?? '—'} et al ·{' '}
                    {relativeAge(p.published_at)}
                  </div>
                </div>
                <div className="text-right font-mono text-meta">
                  <div className="tabnum font-bold text-almanac-red">
                    {(p.pulse_score ?? 0).toFixed(1)}
                  </div>
                  <div className="tabnum text-ink-mute">
                    {p.is_active ? 'live' : 'archived'}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}
