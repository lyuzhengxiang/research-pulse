import pLimit from 'p-limit';
import { fetchHfPaperInfo, githubRepoFromProjectPage } from '../clients/paperswithcode.js';
import { supabase, log } from '../db.js';

const BATCH_SIZE = 30;
const CONCURRENCY = 3;

/**
 * For each recent paper without an HF check yet, hit HuggingFace Papers
 * API. If a GitHub projectPage is present, record a paper_links row
 * with source='github'. Always record a 'huggingface' marker so we
 * don't re-check the same paper forever.
 */
export async function findGithubRepos() {
  const task = 'findGithubRepos';
  try {
    const sinceIso = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recent, error } = await supabase
      .from('papers')
      .select('arxiv_id')
      .gte('published_at', sinceIso)
      .eq('is_active', true)
      .order('published_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    if (!recent?.length) return;

    const arxivIds = recent.map((r) => r.arxiv_id);
    const { data: existing } = await supabase
      .from('paper_links')
      .select('arxiv_id, source')
      .in('arxiv_id', arxivIds)
      .in('source', ['paperswithcode', 'github']);
    const alreadyChecked = new Set((existing ?? []).map((e) => e.arxiv_id));

    const todo = arxivIds.filter((id) => !alreadyChecked.has(id)).slice(0, BATCH_SIZE);
    if (!todo.length) {
      log(task, 'nothing new to check');
      return;
    }

    const limit = pLimit(CONCURRENCY);
    let hfFound = 0;
    let githubFound = 0;

    await Promise.all(
      todo.map((arxivId) =>
        limit(async () => {
          const info = await fetchHfPaperInfo(arxivId);
          if (!info) return; // network error, will retry next run

          // Always record the HF check so we don't re-look up every run.
          const rows: any[] = [
            {
              arxiv_id: arxivId,
              source: 'paperswithcode',
              url: info.found ? `https://huggingface.co/papers/${arxivId}` : 'none',
              external_id: info.found ? arxivId : 'none',
              metadata: { checked: true, source: 'huggingface', found: info.found, upvotes: info.upvotes },
            },
          ];
          if (info.found) hfFound++;

          const gh = githubRepoFromProjectPage(info.projectPage);
          if (gh) {
            githubFound++;
            rows.push({
              arxiv_id: arxivId,
              source: 'github',
              url: gh.url,
              external_id: `${gh.owner}/${gh.name}`,
              metadata: { owner: gh.owner, name: gh.name, via: 'huggingface' },
            });
          }

          const { error: insErr } = await supabase.from('paper_links').insert(rows);
          if (insErr) {
            log(task, 'insert failed', { arxivId, err: insErr.message });
          }
        }),
      ),
    );

    log(task, 'done', { checked: todo.length, hfFound, githubFound });
  } catch (err) {
    log(task, 'ERROR', { message: (err as Error).message });
  }
}
