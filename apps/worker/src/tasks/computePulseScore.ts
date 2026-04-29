import { supabase, log } from '../db.js';

/**
 * Compute a "pulse score" per active paper from GitHub stars only.
 *
 *   pulse = stars * recencyMult
 *   recencyMult = 1 / (1 + log10(max(0.25, daysSincePublish)))
 *
 * - Absolute stars (not 24h delta): a 5000-star paper with no daily growth
 *   should still rank above an unknown one. The recency decay handles the
 *   "old viral paper drowns out fresh ones" problem.
 * - Floor of 0.25 days keeps log10(daysOld) > -1, so recencyMult stays
 *   positive (max ~2.5x boost for papers under ~6 hours old).
 *
 * HN/HF signals are intentionally ignored — coverage is too sparse to be a
 * useful ranking signal across the full corpus.
 */
export async function computePulseScore() {
  const task = 'computePulseScore';
  try {
    const { data: actives } = await supabase
      .from('papers')
      .select('arxiv_id, published_at')
      .eq('is_active', true)
      .limit(2000);
    if (!actives?.length) return;

    const arxivIds = actives.map((p) => p.arxiv_id);
    const pubMap = new Map(actives.map((p) => [p.arxiv_id, p.published_at]));

    // Latest stars value per paper. We only ever need the most recent row.
    const { data: starRows } = await supabase
      .from('paper_metrics')
      .select('arxiv_id, value, recorded_at')
      .eq('metric', 'stars')
      .in('arxiv_id', arxivIds)
      .order('recorded_at', { ascending: false });

    const latestStars = new Map<string, number>();
    for (const r of starRows ?? []) {
      if (!latestStars.has(r.arxiv_id)) latestStars.set(r.arxiv_id, r.value);
    }

    const updates: { arxiv_id: string; pulse_score: number }[] = [];
    for (const arxivId of arxivIds) {
      const stars = latestStars.get(arxivId) ?? 0;
      const pubIso = pubMap.get(arxivId)!;
      const daysOld = Math.max(
        0.25,
        (Date.now() - new Date(pubIso).getTime()) / (24 * 60 * 60 * 1000),
      );
      const recencyMult = 1 / (1 + Math.log10(daysOld));
      const pulse = stars * recencyMult;
      updates.push({ arxiv_id: arxivId, pulse_score: Number(pulse.toFixed(2)) });
    }

    let written = 0;
    for (const u of updates) {
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

    log(task, 'done', {
      papers: updates.length,
      written,
      withStars: latestStars.size,
    });
  } catch (err) {
    log(task, 'ERROR', { message: (err as Error).message });
  }
}
