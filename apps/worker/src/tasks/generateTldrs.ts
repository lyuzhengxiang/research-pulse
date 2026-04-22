import pLimit from 'p-limit';
import { generateTldr } from '../clients/claude.js';
import { supabase, log } from '../db.js';
import { env } from '../env.js';

const BATCH_SIZE = 8;
const CONCURRENCY = 3;

function abstractFallback(abstract: string): string {
  return (abstract ?? '').split(/(?<=[.!?])\s+/).slice(0, 2).join(' ');
}

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

    // Without a Claude key, just use the first two sentences of the abstract
    // so the UI doesn't show "TLDR generating…" forever.
    if (!env.ANTHROPIC_API_KEY) {
      let written = 0;
      for (const p of data) {
        const fallback = abstractFallback(p.abstract);
        if (!fallback) continue;
        await supabase.from('papers').update({ tldr: fallback }).eq('arxiv_id', p.arxiv_id);
        written++;
      }
      log(task, 'no ANTHROPIC_API_KEY set — used abstract fallback', { written });
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
            const fallback = abstractFallback(p.abstract);
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
