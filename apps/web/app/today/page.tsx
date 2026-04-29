import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { TarotCard } from '@/components/TarotCard';
import { fetchTodayReading } from '@/lib/todayReading';

export const dynamic = 'force-dynamic';

export default async function TodayPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const reading = await fetchTodayReading(supabase, user?.id ?? null);

  if (!reading) {
    return (
      <div className="mx-auto max-w-[780px] px-9 pb-9 pt-6 text-center">
        <div className="font-mono text-ticker uppercase tracking-kicker text-almanac-red">
          ✦ Daily Digest
        </div>
        <h1 className="mt-2 font-serif text-today-title font-bold tracking-tight-1">
          Nothing yet today.
        </h1>
        <p className="mt-3 font-serif italic text-[16px] text-ink-mute">
          Today&apos;s digest will appear after the next poll.
        </p>
        <Link
          href="/"
          className="mt-5 inline-block font-serif italic text-[15px] text-almanac-red"
        >
          ← back to feed
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 pb-9 pt-6 lg:px-9">
      <header className="mx-auto max-w-[780px] border-b-[3px] border-double border-ink-rule pb-3 text-center">
        <div className="font-mono text-ticker uppercase tracking-masthead-meta text-almanac-red">
          ★ ★ ★ &nbsp; {reading.dateLabel} · DRAWN AT {reading.drawnAt} &nbsp; ★ ★ ★
        </div>
        <h1 className="mt-1.5 font-serif text-today-title font-bold tracking-tight-1">
          Daily Digest
        </h1>
        <div className="mt-1 font-serif italic text-[16px] text-ink-mute">
          « Three picks from today&apos;s arXiv papers. Refreshed every morning. »
        </div>
      </header>

      <div className="flex flex-wrap justify-center gap-4 pb-5 pt-8 lg:flex-nowrap lg:gap-10 lg:pt-12">
        <div>
          <TarotCard
            paper={reading.past.paper}
            roman={reading.past.roman}
            position="past"
            width={200}
            height={320}
          />
        </div>
        <div style={{ marginTop: -12 }}>
          <TarotCard
            paper={reading.present.paper}
            roman={reading.present.roman}
            position="present"
            big
            width={230}
            height={360}
          />
        </div>
        <div>
          <TarotCard
            paper={reading.future.paper}
            roman={reading.future.roman}
            position="future"
            reversed={reading.future.reversed}
            width={200}
            height={320}
          />
        </div>
      </div>

      <div
        className="mx-auto max-w-[760px] border-y border-ink-rule px-4 py-4.5 text-center lg:px-9"
        style={{ background: '#e9e2d2' }}
      >
        <div className="font-mono text-ticker uppercase tracking-kicker text-almanac-red">
          — The Take —
        </div>
        <p className="mx-auto mt-2.5 mb-0 max-w-[700px] font-serif italic text-reader leading-[1.55]">
          {reading.interpretation}{' '}
          <span className="font-semibold text-almanac-red">Pulse is running hot — check your starred.</span>
        </p>
      </div>

      <section className="mt-7">
        <div className="text-center font-mono text-ticker uppercase tracking-kicker text-almanac-red">
          — Also worth a look —
        </div>
        <div className="mt-5 flex flex-wrap justify-center gap-4">
          {reading.minor.map(({ paper, roman }) => (
            <TarotCard key={paper.arxiv_id} paper={paper} roman={roman} width={150} height={230} />
          ))}
        </div>
      </section>

      <div className="mt-6 text-center font-serif italic text-[15px]">
        <Link href="/" className="text-almanac-red almanac-link">
          ← back to feed
        </Link>
      </div>
    </div>
  );
}
