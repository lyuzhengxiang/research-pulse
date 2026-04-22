import { supabase, log } from '../db.js';

const W_STARS = 1.0;
const W_HN_SCORE = 3.0;
const W_HN_COMMENTS = 2.0;

/**
 * Compute a "pulse score" per active paper:
 *   weighted velocity of GitHub stars / HN score / HN comments in the last 24h,
 *   multiplied by a recency decay (days since publish).
 */
export async function computePulseScore() {
  const task = 'computePulseScore';
  try {
    const dayAgoIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const twoDaysAgoIso = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data: actives } = await supabase
      .from('papers')
      .select('arxiv_id, published_at')
      .eq('is_active', true)
      .limit(1000);
    if (!actives?.length) return;

    const arxivIds = actives.map((p) => p.arxiv_id);
    const pubMap = new Map(actives.map((p) => [p.arxiv_id, p.published_at]));

    const { data: metrics } = await supabase
      .from('paper_metrics')
      .select('arxiv_id, metric, value, recorded_at')
      .in('arxiv_id', arxivIds)
      .gte('recorded_at', twoDaysAgoIso)
      .order('recorded_at', { ascending: true });

    type Series = { value: number; recorded_at: string }[];
    const byPaperMetric = new Map<string, Map<string, Series>>();
    for (const m of metrics ?? []) {
      if (!byPaperMetric.has(m.arxiv_id)) byPaperMetric.set(m.arxiv_id, new Map());
      const inner = byPaperMetric.get(m.arxiv_id)!;
      const arr = inner.get(m.metric) ?? [];
      arr.push({ value: m.value, recorded_at: m.recorded_at });
      inner.set(m.metric, arr);
    }

    function deltaLast24h(series: Series | undefined): number {
      if (!series?.length) return 0;
      const last = series[series.length - 1];
      const base = series.find((p) => p.recorded_at >= dayAgoIso) ?? series[0];
      return Math.max(0, last.value - base.value);
    }

    const updates: { arxiv_id: string; pulse_score: number }[] = [];
    for (const arxivId of arxivIds) {
      const inner = byPaperMetric.get(arxivId);
      const starDelta = deltaLast24h(inner?.get('stars'));
      const hnScoreDelta = deltaLast24h(inner?.get('hn_score'));
      const hnCommentDelta = deltaLast24h(inner?.get('hn_comments'));

      const pubIso = pubMap.get(arxivId)!;
      const daysOld = Math.max(0.25, (Date.now() - new Date(pubIso).getTime()) / (24 * 60 * 60 * 1000));
      const recencyMult = 1 / (1 + Math.log10(daysOld));

      const rawScore =
        W_STARS * starDelta + W_HN_SCORE * hnScoreDelta + W_HN_COMMENTS * hnCommentDelta;
      const pulse = rawScore * recencyMult;
      updates.push({ arxiv_id: arxivId, pulse_score: Number(pulse.toFixed(2)) });
    }

    // Batch update via upsert on existing rows (only pulse_score changes).
    // We do chunks to avoid huge payloads.
    const CHUNK = 100;
    let written = 0;
    for (let i = 0; i < updates.length; i += CHUNK) {
      const chunk = updates.slice(i, i + CHUNK);
      for (const u of chunk) {
        const { error } = await supabase
          .from('papers')
          .update({ pulse_score: u.pulse_score })
          .eq('arxiv_id', u.arxiv_id);
        if (error) {
          log(task, 'update err', { arxiv_id: u.arxiv_id, err: error.message });
          continue;
        }
        written++;
      }
    }

    log(task, 'done', { papers: updates.length, written });
  } catch (err) {
    log(task, 'ERROR', { message: (err as Error).message });
  }
}
