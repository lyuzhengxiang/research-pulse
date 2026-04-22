import pLimit from 'p-limit';
import { generateTldr } from '../clients/claude.js';
import { supabase, log } from '../db.js';

const BATCH_SIZE = 8;
const CONCURRENCY = 3;

export async function generateTldrsForNewPapers() {
  const task = 'generateTldrsForNewPapers';
  try {
    const { data, error } = await supabase
      .from('papers')
      .select('arxiv_id, title, abstract')
      .is('tldr', null)
      .order('published_at', { ascending: false })
      .limit(BATCH_SIZE);

    if (error) throw error;
    if (!data?.length) {
      log(task, 'no papers needing TLDR');
      return;
    }

    const limit = pLimit(CONCURRENCY);
    let success = 0;
    let failed = 0;

    await Promise.all(
      data.map((p) =>
        limit(async () => {
          try {
            const tldr = await generateTldr({ title: p.title, abstract: p.abstract });
            const { error: updErr } = await supabase
              .from('papers')
              .update({ tldr })
              .eq('arxiv_id', p.arxiv_id);
            if (updErr) throw updErr;
            success++;
          } catch (e) {
            failed++;
            log(task, 'tldr failed', { arxiv_id: p.arxiv_id, err: (e as Error).message });
            const fallback = (p.abstract ?? '').split(/(?<=[.!?])\s+/).slice(0, 2).join(' ');
            if (fallback) {
              await supabase.from('papers').update({ tldr: fallback }).eq('arxiv_id', p.arxiv_id);
            }
          }
        }),
      ),
    );

    log(task, 'done', { success, failed });
  } catch (err) {
    log(task, 'ERROR', { message: (err as Error).message });
  }
}
