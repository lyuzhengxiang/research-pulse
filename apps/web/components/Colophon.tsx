import { createClient } from '@/lib/supabase/server';
import { ColophonClock } from './ColophonClock';

export async function Colophon() {
  const supabase = await createClient();
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const [{ count: papers }, { count: active }, { count: writes }, { data: { user } }] =
    await Promise.all([
      supabase.from('papers').select('*', { count: 'exact', head: true }),
      supabase.from('papers').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase
        .from('paper_metrics')
        .select('*', { count: 'exact', head: true })
        .gte('recorded_at', hourAgo),
      supabase.auth.getUser(),
    ]);

  const handle = user?.email ? user.email.split('@')[0] : 'a guest reader';

  return (
    <footer className="mt-16 border-t-[3px] border-double border-ink-rule bg-paper px-10 py-3.5 font-mono text-ticker uppercase tracking-mono-uc text-ink-mute">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-2">
        <ColophonClock />
        <span>
          {(papers ?? 0).toLocaleString()} papers in circulation ·{' '}
          {(active ?? 0).toLocaleString()} active · {(writes ?? 0).toLocaleString()} writes/h
        </span>
        <span>signed in as {handle}</span>
      </div>
    </footer>
  );
}
