import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LivePulseCard } from '@/components/LivePulseCard';
import { StarButton } from '@/components/StarButton';
import { PaperLeadFigure } from '@/components/PaperLeadFigure';
import { GenerateSummaryButton } from '@/components/GenerateSummaryButton';
import { ensurePaperFigure } from '@/lib/figure';
import type { Paper, PaperLink } from '@research-pulse/shared';

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

export default async function PaperPage({
  params,
}: {
  params: Promise<{ arxivId: string }>;
}) {
  const { arxivId: rawArxivId } = await params;
  const arxivId = decodeURIComponent(rawArxivId);
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

  const abstractParas = paper.abstract.split(/\n\s*\n/).filter(Boolean);
  const firstPara = abstractParas[0] ?? paper.abstract ?? '';
  const restParas = abstractParas.slice(1);
  const figureUrl = paper.figure_url ?? (await ensurePaperFigure(paper.arxiv_id));

  return (
    <article className="mx-auto max-w-[1100px] px-[60px] pb-9 pt-5">
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
        ★ ★ ★ &nbsp;Paper&nbsp; ★ ★ ★
      </div>

      <header className="border-y-[3px] border-double border-ink-rule px-0 py-3 text-center">
        <div className="border-t border-ink-rule pt-3 -mt-3" />
        <div className="font-mono text-ticker uppercase tracking-kicker text-ink-mute">
          {paper.primary_category} · arxiv:{paper.arxiv_id} · published {relativeAge(paper.published_at)} ago
        </div>
        <h1 className="my-1.5 font-serif text-title-xl font-bold tracking-mast leading-[1.02]">
          {paper.title}
        </h1>
        <div className="font-serif italic text-[14px]">
          By {paper.authors.slice(0, 4).join(', ')}
          {paper.authors.length > 4 && ` and ${paper.authors.length - 4} others`}
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-center gap-4 border-b border-ink-rule py-2.5">
        <StarButton arxivId={paper.arxiv_id} initialStarred={starred} userId={user?.id ?? null} />
        <ActionLink href={`https://arxiv.org/pdf/${paper.arxiv_id}`}>· read PDF ↗</ActionLink>
        {github && (
          <ActionLink href={github.url}>
            · repository ↗
          </ActionLink>
        )}
        {hn && <ActionLink href={hn.url}>· Hacker News ↗</ActionLink>}
      </div>

      <GenerateSummaryButton
        arxivId={paper.arxiv_id}
        initialTldr={paper.tldr}
        signedIn={!!user}
      />


      <div className="mt-5 grid grid-cols-[2fr_1fr] gap-8">
        <div className="almanac-prose drop-cap" style={{ columnCount: 2, columnGap: 24 }}>
          <p>{firstPara}</p>
          {restParas.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <aside className="space-y-4.5">
          <div>
            <PaperLeadFigure
              arxivId={paper.arxiv_id}
              url={figureUrl}
              size={260}
            />
            <div className="mt-1.5 text-center font-mono text-ticker uppercase tracking-mono-uc text-ink-mute">
              {figureUrl ? 'FIG. 1 · from the paper' : 'no figure available'}
            </div>
          </div>
          <div className="mt-4">
            <LivePulseCard arxivId={paper.arxiv_id} pulseScore={paper.pulse_score} />
          </div>
        </aside>
      </div>
    </article>
  );
}

function ActionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-mono text-meta uppercase tracking-mono-uc"
      style={{ color: '#214a8a' }}
    >
      {children}
    </a>
  );
}
