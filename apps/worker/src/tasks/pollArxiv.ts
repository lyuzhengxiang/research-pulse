import { fetchRecentPapers } from '../clients/arxiv.js';
import { supabase, log } from '../db.js';
import { env } from '../env.js';

export async function pollArxivNewPapers() {
  const task = 'pollArxivNewPapers';
  try {
    // 26h window captures arxiv's once-per-day release batch reliably
    // regardless of what time this task fires. Upserts are idempotent.
    const sinceIso = new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString();
    const papers = await fetchRecentPapers({
      categories: env.ARXIV_CATEGORIES,
      maxResults: 100,
      sinceIso,
    });

    if (!papers.length) {
      log(task, 'no new papers');
      return;
    }

    const rows = papers.map((p) => ({
      arxiv_id: p.arxiv_id,
      title: p.title,
      authors: p.authors,
      abstract: p.abstract,
      primary_category: p.primary_category,
      categories: p.categories,
      published_at: p.published_at,
      is_active: true,
    }));

    const { error, count } = await supabase
      .from('papers')
      .upsert(rows, { onConflict: 'arxiv_id', ignoreDuplicates: false, count: 'exact' });

    if (error) throw error;
    log(task, 'upserted', { attempted: rows.length, upserted: count ?? rows.length });
  } catch (err) {
    log(task, 'ERROR', { message: (err as Error).message });
  }
}
