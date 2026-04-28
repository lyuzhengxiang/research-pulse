import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { MastheadNav } from './MastheadNav';

const VOLUME = 'IV';
const ISSUE = '218';

function formatHeader(date: Date) {
  const day = date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }).toUpperCase();
  const dom = date.getUTCDate();
  const mon = date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase();
  const yr = date.getUTCFullYear();
  return `${day} ${dom} ${mon} ${yr}`;
}

export async function Masthead() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const today = formatHeader(new Date());
  const utcHour = String(new Date().getUTCHours()).padStart(2, '0');
  const utcMin = String(new Date().getUTCMinutes()).padStart(2, '0');

  return (
    <header className="relative border-b-[3px] border-double border-ink-rule bg-paper px-10 pt-[18px] pb-2 text-center">
      <div className="absolute left-10 top-6 font-mono text-ticker uppercase tracking-mono-uc text-ink">
        EST. 2026 · DAILY
      </div>
      <div className="absolute right-10 top-6 font-mono text-ticker uppercase tracking-mono-uc text-ink">
        WORKER · LIVE · {utcHour}:{utcMin} UTC
      </div>

      <div className="font-mono text-ticker uppercase tracking-masthead-meta text-ink">
        Vol. {VOLUME} · No. {ISSUE} · {today} · TWO PENCE
      </div>

      <Link href="/" className="block almanac-link">
        <h1 className="mt-1 font-serif text-title-xl font-bold leading-none tracking-mast text-ink">
          The Research Almanac
        </h1>
      </Link>

      <div className="mt-1 font-serif italic text-[14px] text-ink">
        « A daily ledger of papers in motion » &nbsp;·&nbsp;
        <Link href="/today" className="almanac-link italic" style={{ color: '#a07a2c' }}>
          ✦ Today&apos;s reading is ready — drawn at 09:00 ↗
        </Link>
      </div>

      <MastheadNav signedIn={!!user} userId={user?.id ?? null} />
    </header>
  );
}
