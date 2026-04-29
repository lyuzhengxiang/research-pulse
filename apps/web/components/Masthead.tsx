import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { MastheadNav } from './MastheadNav';

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

function formatHeader(date: Date) {
  const day = date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }).toUpperCase();
  const dom = date.getUTCDate();
  const mon = date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase();
  const yr = date.getUTCFullYear();
  return `${day} ${dom} ${mon} ${yr}`;
}

function dayOfYear(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  return Math.floor((date.getTime() - start) / 86_400_000) + 1;
}

export async function Masthead() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const now = new Date();
  const today = formatHeader(now);
  const utcHour = String(now.getUTCHours()).padStart(2, '0');
  const utcMin = String(now.getUTCMinutes()).padStart(2, '0');
  const volume = ROMAN[(now.getUTCFullYear() - 2025) % ROMAN.length] || 'I';
  const issue = dayOfYear(now);

  return (
    <header className="relative border-b-[3px] border-double border-ink-rule bg-paper px-10 pt-[18px] pb-2 text-center">
      <div className="absolute left-10 top-6 font-mono text-ticker uppercase tracking-mono-uc text-ink">
        EST. 2026 · DAILY
      </div>
      <div className="absolute right-10 top-6 font-mono text-ticker uppercase tracking-mono-uc text-ink">
        WORKER · LIVE · {utcHour}:{utcMin} UTC
      </div>

      <div className="font-mono text-ticker uppercase tracking-masthead-meta text-ink">
        Vol. {volume} · No. {issue} · {today} · FREE
      </div>

      <Link href="/" className="block almanac-link">
        <h1 className="mt-1 font-serif text-title-xl font-bold leading-none tracking-mast text-ink">
          Research Pulse
        </h1>
      </Link>

      <div className="mt-1 font-serif italic text-[16px] text-ink">
        « Live AI/ML papers, ranked by momentum » &nbsp;·&nbsp;
        <Link href="/today" className="almanac-link italic" style={{ color: '#a07a2c' }}>
          ✦ Daily Digest ↗
        </Link>
      </div>

      <MastheadNav signedIn={!!user} userId={user?.id ?? null} />
    </header>
  );
}
