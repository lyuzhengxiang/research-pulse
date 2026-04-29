import Link from 'next/link';
import type { Paper } from '@research-pulse/shared';

const F = {
  cardBg: '#16110b',
  cardEdge: '#0a0805',
  ink: '#f1ece1',
  giltDim: '#7a5d20',
  gilt: '#c2964a',
  wax: '#b1342a',
  mute: '#9c8e72',
  pageMute: '#6b6055',
};

function relativeAge(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h`;
  const d = Math.round(h / 24);
  return `${d}d`;
}

function CardFigure({
  pulse,
  rays,
  big,
}: {
  pulse: number;
  rays: number;
  big: boolean;
}) {
  const s = big ? 110 : 78;
  const intensity = Math.min(1, Math.max(0, pulse / 100));
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" className="block">
      <circle cx="50" cy="50" r="38" fill="none" stroke={F.giltDim} strokeWidth="0.6" />
      <circle cx="50" cy="50" r="30" fill="none" stroke={F.gilt} strokeWidth="0.6" />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        const r1 = 22;
        const r2 = 22 + intensity * 16;
        return (
          <line
            key={i}
            x1={50 + Math.cos(a) * r1}
            y1={50 + Math.sin(a) * r1}
            x2={50 + Math.cos(a) * r2}
            y2={50 + Math.sin(a) * r2}
            stroke={F.gilt}
            strokeWidth="0.8"
          />
        );
      })}
      <polygon
        points={Array.from({ length: 6 })
          .map((_, i) => {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
            const r = 10 + intensity * 8;
            return `${50 + Math.cos(a) * r},${50 + Math.sin(a) * r}`;
          })
          .join(' ')}
        fill={F.wax}
        stroke={F.gilt}
        strokeWidth="0.6"
      />
      {Array.from({ length: rays }).map((_, i) => {
        const a = -Math.PI / 2 + (i / Math.max(rays, 1)) * Math.PI * 2;
        const r = 42;
        return (
          <text
            key={i}
            x={50 + Math.cos(a) * r}
            y={50 + Math.sin(a) * r + 2}
            fontSize="5"
            fill={F.gilt}
            textAnchor="middle"
          >
            ✦
          </text>
        );
      })}
    </svg>
  );
}

export function TarotCard({
  paper,
  roman,
  position,
  reversed = false,
  big = false,
  width = 200,
  height = 320,
  link = true,
}: {
  paper: Paper;
  roman: string;
  position?: 'past' | 'present' | 'future';
  reversed?: boolean;
  big?: boolean;
  width?: number;
  height?: number;
  link?: boolean;
}) {
  const stars = Math.min(5, Math.max(0, Math.round(paper.pulse_score / 20)));
  const truncMax = big ? 70 : 48;
  const titleShort =
    paper.title.length > truncMax ? `${paper.title.slice(0, truncMax - 2)}…` : paper.title;
  const positionLabel = position
    ? position === 'past'
      ? '·  PAST  ·'
      : position === 'present'
      ? '·  PRESENT  ·'
      : '·  FUTURE  ·'
    : null;

  const inner = (
    <div
      className="relative"
      style={{
        width,
        height,
        transform: reversed ? 'rotate(180deg)' : 'none',
        cursor: link ? 'pointer' : 'default',
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: F.cardBg,
          borderRadius: 6,
          boxShadow: `0 14px 28px rgba(31,26,20,0.28), 0 2px 6px rgba(31,26,20,0.18), 0 0 0 1px ${F.cardEdge}`,
        }}
      />
      <div
        className="absolute flex flex-col"
        style={{
          inset: 6,
          border: `1px solid ${F.gilt}`,
          borderRadius: 3,
          padding: '10px 12px',
        }}
      >
        <div
          className="flex items-baseline justify-between pb-1"
          style={{ borderBottom: `1px solid ${F.gilt}55` }}
        >
          <span
            className="font-serif font-semibold tracking-[0.05em]"
            style={{ fontSize: big ? 22 : 16, color: F.ink }}
          >
            {roman}
          </span>
          <span
            className="font-mono uppercase tracking-[0.2em]"
            style={{ fontSize: 10, color: F.mute }}
          >
            {paper.primary_category}
          </span>
        </div>
        <div
          className="flex flex-1 items-center justify-center py-2"
          style={{ borderBottom: `1px solid ${F.gilt}55` }}
        >
          <CardFigure pulse={paper.pulse_score} rays={stars} big={big} />
        </div>
        <div className="pt-1.5 text-center">
          <div
            className="font-serif italic font-semibold leading-[1.2]"
            style={{ fontSize: big ? 15 : 12, color: F.ink }}
          >
            {titleShort}
          </div>
          <div
            className="mt-0.5 font-serif tracking-[0.06em]"
            style={{ fontSize: 12, color: F.mute }}
          >
            {paper.authors[0] ?? '—'} · {relativeAge(paper.published_at)}
          </div>
          <div
            className="mt-1 font-mono tracking-[0.15em]"
            style={{ fontSize: 13, color: F.gilt }}
          >
            {'★'.repeat(stars)}
            {'·'.repeat(5 - stars)} {paper.pulse_score.toFixed(1)}
          </div>
        </div>
      </div>
      {positionLabel && (
        <div
          className="absolute -top-[18px] left-1/2 -translate-x-1/2 whitespace-nowrap font-serif italic tracking-[0.1em]"
          style={{ fontSize: 14, color: F.pageMute }}
        >
          {positionLabel}
        </div>
      )}
    </div>
  );

  if (!link) return inner;
  return (
    <Link
      href={`/paper/${encodeURIComponent(paper.arxiv_id)}`}
      className="no-underline"
    >
      {inner}
    </Link>
  );
}
