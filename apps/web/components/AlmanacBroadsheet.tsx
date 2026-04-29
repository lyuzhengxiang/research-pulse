import Link from 'next/link';
import type { Paper } from '@research-pulse/shared';
import { Telegrams, type Telegram } from './Telegrams';
import { PaperLeadFigure } from './PaperLeadFigure';
import { MorePapers } from './MorePapers';
import type { FeedScope } from '@/lib/papers';

function dropCap(s: string): { first: string; rest: string } {
  if (!s) return { first: '', rest: '' };
  return { first: s.charAt(0), rest: s.slice(1) };
}

function relativeAge(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h`;
  const d = Math.round(h / 24);
  return `${d}d`;
}

export function AlmanacBroadsheet({
  kicker,
  title,
  strapline,
  papers,
  initialTelegrams,
  userId,
  scope,
}: {
  kicker: string;
  title: string;
  strapline: string;
  papers: Paper[];
  initialTelegrams: Telegram[];
  userId: string | null;
  scope: FeedScope;
}) {
  if (papers.length === 0) {
    return (
      <div className="mx-auto max-w-[900px] px-10 py-16 text-center">
        <div className="font-mono text-ticker uppercase tracking-kicker text-almanac-red">
          {kicker}
        </div>
        <h2 className="mt-2 font-serif text-page-title font-bold tracking-lead">{title}</h2>
        <p className="mt-3 font-serif italic text-[14px] text-ink-mute">
          No papers yet. Check back after the next poll.
        </p>
      </div>
    );
  }

  const lead = papers[0];
  const top4 = papers.slice(1, 5);
  const list = papers.slice(5);

  const leadDrop = dropCap(lead.tldr || lead.abstract || '');
  const leadBody = lead.tldr || (lead.abstract ? lead.abstract.slice(0, 360) + '…' : 'Awaiting summary.');

  return (
    <div>
      <div className="border-b border-ink-rule px-10 py-2 text-center">
        <div className="font-mono text-ticker uppercase tracking-kicker text-ink-mute">
          {kicker}
        </div>
        <div className="font-serif italic text-[13px] text-ink-mute">{strapline}</div>
      </div>

      <div className="grid grid-cols-[2fr_3fr_2fr] gap-7 border-b border-ink-rule px-10 py-5">
        {/* LEFT — INDEX */}
        <aside aria-label="Index">
          <div className="border-b border-ink-rule pb-1 font-mono text-ticker uppercase tracking-kicker">
            Index
          </div>
          {top4.map((p, i) => (
            <Link
              key={p.arxiv_id}
              href={`/paper/${encodeURIComponent(p.arxiv_id)}`}
              className="almanac-link block border-b border-dotted border-ink-rule py-2.5"
            >
              <div className="font-mono uppercase tracking-mono-uc text-ink-mute" style={{ fontSize: 9 }}>
                {p.primary_category} · {relativeAge(p.published_at)} ago
              </div>
              <div className="mt-0.5 font-serif text-list font-semibold leading-tight">
                {p.title}
              </div>
              <div className="mt-1 font-mono text-meta text-ink-mute">
                #<span className="text-ink">{i + 2}</span> · pulse{' '}
                <span className="tabnum text-ink">{p.pulse_score.toFixed(1)}</span>
              </div>
            </Link>
          ))}
        </aside>

        {/* CENTER — LEAD */}
        <article aria-label="Lead">
          <div className="font-mono text-ticker uppercase tracking-kicker text-almanac-red">
            ★ Top Paper ★
          </div>
          <Link
            href={`/paper/${encodeURIComponent(lead.arxiv_id)}`}
            className="almanac-link block"
          >
            <h2 className="my-1.5 font-serif text-lead-title font-bold tracking-lead">
              {lead.title}
            </h2>
          </Link>
          <p className="font-serif italic text-[13px] text-[#3a342b]">
            by {lead.authors.slice(0, 3).join(', ')}
            {lead.authors.length > 3 && `, et al`} · published {relativeAge(lead.published_at)} ago
          </p>
          <div className="mt-3 flex items-start gap-3.5">
            <PaperLeadFigure arxivId={lead.arxiv_id} caption="FIG. 1 · arch. diagram" />
            <p className="m-0 font-serif text-body">
              {leadDrop.first ? (
                <>
                  <span
                    className="font-serif font-bold"
                    style={{
                      fontSize: 56,
                      float: 'left',
                      lineHeight: 0.85,
                      marginRight: 6,
                      marginTop: 6,
                    }}
                  >
                    {leadDrop.first}
                  </span>
                  {leadDrop.rest || leadBody.slice(1)}
                </>
              ) : (
                leadBody
              )}
            </p>
          </div>
          <div className="mt-3.5 flex gap-5 border-y border-ink-rule py-1.5 font-mono text-meta">
            <span>
              ★ <b className="tabnum">{(lead.pulse_score * 30).toFixed(0)}</b>
            </span>
            <span style={{ color: '#214a8a' }}>
              cat <b>{lead.primary_category}</b>
            </span>
            <span style={{ color: '#b1342a' }}>
              pulse <b className="tabnum">{lead.pulse_score.toFixed(1)}</b>
            </span>
            <Link
              href={`/paper/${encodeURIComponent(lead.arxiv_id)}`}
              className="almanac-link ml-auto"
              style={{ color: '#214a8a' }}
            >
              read more ↗
            </Link>
          </div>
        </article>

        {/* RIGHT — TELEGRAMS */}
        <Telegrams initial={initialTelegrams} userId={userId} />
      </div>

      <MorePapers initial={list} scope={scope} initialOffset={papers.length} />
    </div>
  );
}
