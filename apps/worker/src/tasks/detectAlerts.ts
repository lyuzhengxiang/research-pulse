import { supabase, log } from '../db.js';

const STAR_SURGE_MIN = 20;      // absolute stars gained in last 1h
const STAR_SURGE_RATIO = 3;     // OR ratio vs prior 24h/h baseline
const ALERT_COOLDOWN_HOURS = 12;

export async function detectStarSurgeAlerts() {
  const task = 'detectStarSurgeAlerts';
  try {
    const { data: starred } = await supabase
      .from('user_starred_papers')
      .select('user_id, arxiv_id');
    if (!starred?.length) {
      log(task, 'no starred papers');
      return;
    }

    const arxivIds = Array.from(new Set(starred.map((s) => s.arxiv_id)));
    const nowIso = new Date().toISOString();
    const oneHourAgoIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const dayAgoIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: recent } = await supabase
      .from('paper_metrics')
      .select('arxiv_id, value, recorded_at')
      .eq('metric', 'stars')
      .in('arxiv_id', arxivIds)
      .gte('recorded_at', dayAgoIso)
      .order('recorded_at', { ascending: true });

    // Group metrics per paper.
    const byPaper = new Map<string, { value: number; recorded_at: string }[]>();
    for (const m of recent ?? []) {
      const arr = byPaper.get(m.arxiv_id) ?? [];
      arr.push({ value: m.value, recorded_at: m.recorded_at });
      byPaper.set(m.arxiv_id, arr);
    }

    // For each paper, compute delta-in-last-hour vs avg-hourly-over-prior-23h.
    const surging = new Map<string, { gained: number; ratio: number }>();
    for (const [arxivId, series] of byPaper) {
      if (series.length < 2) continue;
      const latest = series[series.length - 1];
      const oneHourSeries = series.filter((p) => p.recorded_at >= oneHourAgoIso);
      const priorSeries = series.filter((p) => p.recorded_at < oneHourAgoIso);
      if (!priorSeries.length) continue;
      const earliestPrior = priorSeries[0];
      const earliestHour = oneHourSeries[0] ?? latest;
      const gained = latest.value - earliestHour.value;
      const priorHours = Math.max(
        1,
        (new Date(earliestHour.recorded_at).getTime() - new Date(earliestPrior.recorded_at).getTime()) /
          3600_000,
      );
      const baselinePerHour = (earliestHour.value - earliestPrior.value) / priorHours;
      const ratio = baselinePerHour > 0 ? gained / baselinePerHour : Infinity;

      if (gained >= STAR_SURGE_MIN || ratio >= STAR_SURGE_RATIO) {
        surging.set(arxivId, { gained, ratio });
      }
    }

    if (surging.size === 0) {
      log(task, 'no surges');
      return;
    }

    // Cooldown check: don't alert same user+paper within last 12h.
    const cooldownIso = new Date(Date.now() - ALERT_COOLDOWN_HOURS * 60 * 60 * 1000).toISOString();
    const { data: recentAlerts } = await supabase
      .from('user_alerts')
      .select('user_id, arxiv_id')
      .eq('alert_type', 'star_surge')
      .gte('created_at', cooldownIso)
      .in('arxiv_id', Array.from(surging.keys()));
    const suppressed = new Set((recentAlerts ?? []).map((a) => `${a.user_id}:${a.arxiv_id}`));

    const toInsert = starred
      .filter((s) => surging.has(s.arxiv_id) && !suppressed.has(`${s.user_id}:${s.arxiv_id}`))
      .map((s) => ({
        user_id: s.user_id,
        arxiv_id: s.arxiv_id,
        alert_type: 'star_surge' as const,
        payload: {
          stars_gained: surging.get(s.arxiv_id)!.gained,
          ratio: Number.isFinite(surging.get(s.arxiv_id)!.ratio)
            ? Number(surging.get(s.arxiv_id)!.ratio.toFixed(2))
            : null,
          detected_at: nowIso,
        },
      }));

    if (!toInsert.length) {
      log(task, 'surges found but all suppressed by cooldown');
      return;
    }

    const { error, count } = await supabase
      .from('user_alerts')
      .insert(toInsert, { count: 'exact' });
    if (error) throw error;
    log(task, 'alerts inserted', { count: count ?? toInsert.length });
  } catch (err) {
    log(task, 'ERROR', { message: (err as Error).message });
  }
}
