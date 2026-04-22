import { supabase, log } from '../db.js';
import { env } from '../env.js';

/**
 * Papers older than ACTIVE_WINDOW_DAYS that no user has starred → mark inactive
 * so pollMetrics stops hitting GitHub/HN for them.
 */
export async function deactivateStalePapers() {
  const task = 'deactivateStalePapers';
  try {
    const cutoffIso = new Date(
      Date.now() - env.ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data: starred } = await supabase.from('user_starred_papers').select('arxiv_id');
    const starredIds = new Set((starred ?? []).map((s) => s.arxiv_id));

    const { data: candidates } = await supabase
      .from('papers')
      .select('arxiv_id')
      .eq('is_active', true)
      .lt('published_at', cutoffIso);
    if (!candidates?.length) {
      log(task, 'nothing to deactivate');
      return;
    }

    const toDeactivate = candidates.filter((c) => !starredIds.has(c.arxiv_id)).map((c) => c.arxiv_id);
    if (!toDeactivate.length) {
      log(task, 'all stale papers are still starred by someone');
      return;
    }

    const { error, count } = await supabase
      .from('papers')
      .update({ is_active: false })
      .in('arxiv_id', toDeactivate);
    if (error) throw error;
    log(task, 'deactivated', { count: count ?? toDeactivate.length });
  } catch (err) {
    log(task, 'ERROR', { message: (err as Error).message });
  }
}
