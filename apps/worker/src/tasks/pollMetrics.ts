import pLimit from 'p-limit';
import { fetchRepoStars } from '../clients/github.js';
import { searchHnForArxivId } from '../clients/hn.js';
import { supabase, log } from '../db.js';
import { env } from '../env.js';

const CONCURRENCY = 5;

export async function pollActivePaperMetrics() {
  const task = 'pollActivePaperMetrics';
  try {
    const sinceIso = new Date(Date.now() - env.ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // Active papers: published within window, OR someone has starred them.
    const { data: recentActive } = await supabase
      .from('papers')
      .select('arxiv_id')
      .eq('is_active', true)
      .gte('published_at', sinceIso)
      .limit(500);
    const { data: starredList } = await supabase
      .from('user_starred_papers')
      .select('arxiv_id');

    const arxivIds = new Set<string>();
    (recentActive ?? []).forEach((r) => arxivIds.add(r.arxiv_id));
    (starredList ?? []).forEach((r) => arxivIds.add(r.arxiv_id));

    if (arxivIds.size === 0) {
      log(task, 'no active papers');
      return;
    }

    const idArr = Array.from(arxivIds);
    const { data: links } = await supabase
      .from('paper_links')
      .select('arxiv_id, source, external_id, url')
      .in('arxiv_id', idArr)
      .in('source', ['github', 'hn']);

    const githubByPaper = new Map<string, { owner: string; name: string }>();
    const hnByPaper = new Map<string, string>();
    for (const l of links ?? []) {
      if (l.source === 'github' && l.external_id) {
        const [owner, name] = l.external_id.split('/');
        if (owner && name) githubByPaper.set(l.arxiv_id, { owner, name });
      } else if (l.source === 'hn') {
        hnByPaper.set(l.arxiv_id, l.external_id);
      }
    }

    const limit = pLimit(CONCURRENCY);
    let inserts = 0;
    const metricsRows: {
      arxiv_id: string;
      source: 'github' | 'hn';
      metric: 'stars' | 'hn_score' | 'hn_comments';
      value: number;
    }[] = [];

    await Promise.all(
      idArr.map((arxivId) =>
        limit(async () => {
          // GitHub stars
          const gh = githubByPaper.get(arxivId);
          if (gh) {
            try {
              const stars = await fetchRepoStars(gh.owner, gh.name);
              if (stars != null) {
                metricsRows.push({ arxiv_id: arxivId, source: 'github', metric: 'stars', value: stars });
              }
            } catch (e) {
              log(task, 'github fetch err', { arxivId, err: (e as Error).message });
            }
          }

          // HN search — also discovers new HN discussions, not just metric updates
          try {
            const hn = await searchHnForArxivId(arxivId);
            if (hn) {
              metricsRows.push({ arxiv_id: arxivId, source: 'hn', metric: 'hn_score', value: hn.points });
              metricsRows.push({
                arxiv_id: arxivId,
                source: 'hn',
                metric: 'hn_comments',
                value: hn.num_comments,
              });

              // First time we see this HN story for this paper? Insert link.
              if (!hnByPaper.has(arxivId)) {
                await supabase.from('paper_links').insert({
                  arxiv_id: arxivId,
                  source: 'hn',
                  url: hn.url,
                  external_id: hn.story_id,
                  metadata: { title: hn.title, created_at: hn.created_at },
                });
                hnByPaper.set(arxivId, hn.story_id);
              }
            }
          } catch (e) {
            log(task, 'hn fetch err', { arxivId, err: (e as Error).message });
          }
        }),
      ),
    );

    if (metricsRows.length) {
      const { error, count } = await supabase
        .from('paper_metrics')
        .insert(metricsRows, { count: 'exact' });
      if (error) throw error;
      inserts = count ?? metricsRows.length;
    }

    log(task, 'done', { papers: idArr.length, metricsInserted: inserts });
  } catch (err) {
    log(task, 'ERROR', { message: (err as Error).message });
  }
}
