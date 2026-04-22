import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TimelineChart } from '@/components/TimelineChart';
import { StarButton } from '@/components/StarButton';
import { formatRelative } from '@/lib/utils';
import type { Paper, PaperLink } from '@research-pulse/shared';

export const dynamic = 'force-dynamic';

export default async function PaperPage({ params }: { params: { arxivId: string } }) {
  const arxivId = decodeURIComponent(params.arxivId);
  const supabase = createClient();

  const [{ data: paperRow }, { data: linkRows }, { data: { user } }] = await Promise.all([
    supabase.from('papers').select('*').eq('arxiv_id', arxivId).maybeSingle(),
    supabase.from('paper_links').select('*').eq('arxiv_id', arxivId),
    supabase.auth.getUser(),
  ]);

  if (!paperRow) notFound();
  const paper = paperRow as Paper;
  const links = (linkRows ?? []) as PaperLink[];
  const github = links.find((l) => l.source === 'github' && l.external_id !== 'none');
  const hn = links.find((l) => l.source === 'hn');

  let starred = false;
  if (user) {
    const { data } = await supabase
      .from('user_starred_papers')
      .select('arxiv_id')
      .eq('user_id', user.id)
      .eq('arxiv_id', arxivId)
      .maybeSingle();
    starred = !!data;
  }

  return (
    <article className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-white/50 hover:text-white">
          ← Back to feed
        </Link>
      </div>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-white/50">
          <span className="rounded bg-accent-900/40 px-1.5 py-0.5 font-mono text-accent-400">
            {paper.primary_category}
          </span>
          {paper.categories
            .filter((c) => c !== paper.primary_category)
            .slice(0, 5)
            .map((c) => (
              <span key={c} className="rounded bg-white/5 px-1.5 py-0.5 font-mono">
                {c}
              </span>
            ))}
          <span>·</span>
          <span>{formatRelative(paper.published_at)}</span>
          <span>·</span>
          <a
            href={`https://arxiv.org/abs/${paper.arxiv_id}`}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-accent-400 hover:text-accent-300"
          >
            {paper.arxiv_id}
          </a>
        </div>
        <h1 className="text-2xl font-semibold leading-tight">{paper.title}</h1>
        <p className="text-sm text-white/60">{paper.authors.join(', ')}</p>
      </header>

      <div className="flex items-center gap-2">
        <StarButton arxivId={paper.arxiv_id} initialStarred={starred} userId={user?.id ?? null} />
        <a
          href={`https://arxiv.org/pdf/${paper.arxiv_id}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-white/20 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
        >
          PDF ↗
        </a>
        {github && (
          <a
            href={github.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-white/20 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
          >
            GitHub: {github.external_id} ↗
          </a>
        )}
        {hn && (
          <a
            href={hn.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-white/20 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
          >
            HN discussion ↗
          </a>
        )}
      </div>

      {paper.tldr && (
        <section className="rounded-lg border border-accent-500/30 bg-accent-500/5 p-4">
          <div className="mb-1 text-xs uppercase tracking-wide text-accent-400">TLDR</div>
          <p className="text-sm">{paper.tldr}</p>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">
          Live pulse
        </h2>
        <TimelineChart arxivId={paper.arxiv_id} />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">
          Abstract
        </h2>
        <p className="whitespace-pre-line text-sm leading-relaxed text-white/80">
          {paper.abstract}
        </p>
      </section>
    </article>
  );
}
