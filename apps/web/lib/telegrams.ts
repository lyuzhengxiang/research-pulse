import type { SupabaseClient } from '@supabase/supabase-js';
import type { Telegram } from '@/components/Telegrams';

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(
    d.getUTCMinutes(),
  ).padStart(2, '0')}:${String(d.getUTCSeconds()).padStart(2, '0')}`;
}

function truncate(s: string, n: number): string {
  if (!s) return '';
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

export async function fetchInitialTelegrams(
  supabase: SupabaseClient,
  userId: string | null,
): Promise<Telegram[]> {
  const [{ data: papers }, { data: links }, alertsRes] = await Promise.all([
    supabase
      .from('papers')
      .select('arxiv_id,title,created_at')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('paper_links')
      .select('id,arxiv_id,source,external_id,discovered_at')
      .order('discovered_at', { ascending: false })
      .limit(8),
    userId
      ? supabase
          .from('user_alerts')
          .select('id,arxiv_id,alert_type,payload,created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(6)
      : Promise.resolve({ data: [] as Array<{ id: number; arxiv_id: string; alert_type: string; payload: { stars_gained?: number; ratio?: number }; created_at: string }> }),
  ]);

  const out: Telegram[] = [];

  for (const p of (papers ?? []) as Array<{ arxiv_id: string; title: string; created_at: string }>) {
    out.push({
      id: `filed:${p.arxiv_id}`,
      ts: fmtTime(p.created_at),
      kind: 'filed',
      text: `filed · ${truncate(p.title, 48)}`,
      arxivId: p.arxiv_id,
    });
  }

  for (const l of (links ?? []) as Array<{ id: number; arxiv_id: string; source: string; external_id: string; discovered_at: string }>) {
    if (l.source === 'github' && l.external_id !== 'none') {
      out.push({
        id: `gh:${l.id}`,
        ts: fmtTime(l.discovered_at),
        kind: 'github_found',
        text: `repository found · gh/${truncate(l.external_id, 28)}`,
        arxivId: l.arxiv_id,
      });
    } else if (l.source === 'hn') {
      out.push({
        id: `hn:${l.id}`,
        ts: fmtTime(l.discovered_at),
        kind: 'hn_found',
        text: `surfaced on Hacker News`,
        arxivId: l.arxiv_id,
      });
    }
  }

  for (const a of (alertsRes.data ?? []) as Array<{ id: number; arxiv_id: string; alert_type: string; payload: { stars_gained?: number; ratio?: number }; created_at: string }>) {
    if (a.alert_type === 'star_surge') {
      const gained = a.payload?.stars_gained ?? 0;
      const ratio = a.payload?.ratio;
      out.push({
        id: `alert:${a.id}`,
        ts: fmtTime(a.created_at),
        kind: 'star_surge',
        text: `+${gained} ★ in 1h${ratio ? ` · ${ratio}× baseline` : ''}`,
        arxivId: a.arxiv_id,
      });
    }
  }

  out.sort((a, b) => b.ts.localeCompare(a.ts));
  return out.slice(0, 9);
}
