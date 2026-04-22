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
  const supabase = await createClient();

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
      <Link
        href="/"
        className="inline-block text-xs tracking-wider text-ink-dim transition hover:text-up"
      >
        ◀ back to feed
      </Link>

      <header className="space-y-3 border border-border bg-bg-surface p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-dim">
          <span className="text-info">[{paper.primary_category}]</span>
          {paper.categories
            .filter((c) => c !== paper.primary_category)
            .slice(0, 5)
            .map((c) => (
              <span key={c} className="text-ink-muted">
                [{c}]
              </span>
            ))}
          <span className="text-ink-muted">│</span>
          <a
            href={`https://arxiv.org/abs/${paper.arxiv_id}`}
            target="_blank"
            rel="noreferrer"
            className="text-info hover:text-up"
          >
            arxiv:{paper.arxiv_id}
          </a>
          <span className="text-ink-muted">│</span>
          <span>submitted {formatRelative(paper.published_at)}</span>
        </div>
        <h1 className="text-2xl font-semibold leading-tight text-ink">
          <span className="text-ink-muted">▸ </span>
          {paper.title}
        </h1>
        <p className="text-sm text-ink-dim">
          {paper.authors.join(', ')}
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <StarButton arxivId={paper.arxiv_id} initialStarred={starred} userId={user?.id ?? null} />
        <TermLink href={`https://arxiv.org/pdf/${paper.arxiv_id}`}>pdf ↗</TermLink>
        {github && (
          <TermLink href={github.url} color="up">
            gh/{github.external_id} ↗
          </TermLink>
        )}
        {hn && (
          <TermLink href={hn.url} color="warn">
            hn_thread ↗
          </TermLink>
        )}
      </div>

      {paper.tldr && (
        <section className="border border-up/30 bg-up/5 p-5">
          <div className="mb-2 text-xs uppercase tracking-[0.2em] text-up">
            <span className="text-ink-muted">$</span> tldr --gpt-5.4
          </div>
          <p className="text-base text-ink">{paper.tldr}</p>
        </section>
      )}

      <section className="space-y-3">
        <SectionHeader label="live pulse" subtitle="GH★ + HN·pts + HN·cmts · realtime" />
        <TimelineChart arxivId={paper.arxiv_id} />
      </section>

      <section className="space-y-3">
        <SectionHeader label="abstract" />
        <p className="whitespace-pre-line border border-border bg-bg-surface p-5 text-sm leading-relaxed text-ink">
          {paper.abstract}
        </p>
      </section>
    </article>
  );
}

function TermLink({
  href,
  children,
  color = 'ink',
}: {
  href: string;
  children: React.ReactNode;
  color?: 'ink' | 'up' | 'warn';
}) {
  const colorMap = {
    ink: 'border-border text-ink-dim hover:text-ink hover:border-bright',
    up: 'border-up/50 text-up hover:bg-up/10',
    warn: 'border-warn/50 text-warn hover:bg-warn/10',
  };
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`border bg-bg-surface px-3 py-1.5 tracking-wide transition ${colorMap[color]}`}
    >
      {children}
    </a>
  );
}

function SectionHeader({ label, subtitle }: { label: string; subtitle?: string }) {
  return (
    <div className="flex items-baseline gap-2 text-xs uppercase tracking-[0.2em]">
      <span className="text-ink-muted">//</span>
      <span className="text-ink">{label}</span>
      {subtitle && <span className="text-ink-dim">— {subtitle}</span>}
    </div>
  );
}
