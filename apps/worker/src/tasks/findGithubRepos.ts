import pLimit from 'p-limit';
import { findRepoForArxivId } from '../clients/paperswithcode.js';
import { supabase, log } from '../db.js';

const BATCH_SIZE = 30;
const CONCURRENCY = 3;

export async function findGithubRepos() {
  const task = 'findGithubRepos';
  try {
    // Look at recent papers that don't yet have a 'github' or 'paperswithcode' link.
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
    let found = 0;
    await Promise.all(
      todo.map((arxivId) =>
        limit(async () => {
          try {
            const repo = await findRepoForArxivId(arxivId);
            if (!repo) {
              // Insert a marker so we don't re-check this paper every run.
              await supabase.from('paper_links').insert({
                arxiv_id: arxivId,
                source: 'paperswithcode',
                url: 'none',
                external_id: 'none',
                metadata: { checked: true, result: 'no_match' },
              });
              return;
            }
            found++;
            await supabase.from('paper_links').insert([
              {
                arxiv_id: arxivId,
                source: 'github',
                url: repo.url,
                external_id: `${repo.owner}/${repo.name}`,
                metadata: { owner: repo.owner, name: repo.name, is_official: repo.is_official },
              },
              {
                arxiv_id: arxivId,
                source: 'paperswithcode',
                url: `https://paperswithcode.com/paper/arxiv:${arxivId}`,
                external_id: `${repo.owner}/${repo.name}`,
                metadata: { checked: true, result: 'found' },
              },
            ]);
          } catch (e) {
            log(task, 'lookup failed', { arxivId, err: (e as Error).message });
          }
        }),
      ),
    );

    log(task, 'done', { checked: todo.length, found });
  } catch (err) {
    log(task, 'ERROR', { message: (err as Error).message });
  }
}
