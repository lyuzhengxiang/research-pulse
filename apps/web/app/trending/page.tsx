import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { fetchInitialTelegrams } from '@/lib/telegrams';
import { AlmanacBroadsheet } from '@/components/AlmanacBroadsheet';
import { fetchPapersPage, PAGE_SIZE, type FeedScope } from '@/lib/papers';

export const dynamic = 'force-dynamic';

type Sort = 'pulse' | 'views' | 'reactions';

const SORTS: Array<{
  key: Sort;
  label: string;
  scope: FeedScope;
  kicker: string;
  title: string;
  strapline: string;
}> = [
  {
    key: 'pulse',
    label: 'Pulse',
    scope: 'trending',
    kicker: '— trending now —',
    title: 'Trending',
    strapline: 'The hottest papers across all topics right now, regardless of your subscriptions.',
  },
  {
    key: 'views',
    label: 'Most Viewed',
    scope: 'most_viewed',
    kicker: '— most viewed —',
    title: 'Most Viewed',
    strapline: 'Papers readers are opening the most.',
  },
  {
    key: 'reactions',
    label: 'Most Reacted',
    scope: 'most_reacted',
    kicker: '— most reacted —',
    title: 'Most Reacted',
    strapline: 'Papers drawing the strongest reader reactions.',
  },
];

function pickSort(value: string | undefined): (typeof SORTS)[number] {
  return SORTS.find((s) => s.key === value) ?? SORTS[0];
}

export default async function TrendingPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort } = await searchParams;
  const active = pickSort(sort);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [papers, telegrams] = await Promise.all([
    fetchPapersPage(active.scope, user?.id ?? null, 0, PAGE_SIZE),
    fetchInitialTelegrams(supabase, user?.id ?? null),
  ]);

  return (
    <>
      <nav
        aria-label="Trending sort"
        className="mx-auto flex max-w-[900px] items-center justify-center gap-4 border-b border-ink-rule px-4 py-2 font-mono text-ticker uppercase tracking-kicker lg:gap-7"
      >
        {SORTS.map((s, i) => {
          const isActive = s.key === active.key;
          const href = s.key === 'pulse' ? '/trending' : `/trending?sort=${s.key}`;
          return (
            <span key={s.key} className="flex items-center gap-4 lg:gap-7">
              {i > 0 && <span className="text-ink-mute">·</span>}
              <Link
                href={href}
                className={`pb-0.5 transition ${
                  isActive
                    ? 'border-b-2 border-almanac-red font-bold text-almanac-red'
                    : 'text-ink hover:text-almanac-red'
                }`}
              >
                {s.label}
              </Link>
            </span>
          );
        })}
      </nav>

      <AlmanacBroadsheet
        kicker={active.kicker}
        title={active.title}
        strapline={active.strapline}
        papers={papers}
        initialTelegrams={telegrams}
        userId={user?.id ?? null}
        scope={active.scope}
      />
    </>
  );
}
