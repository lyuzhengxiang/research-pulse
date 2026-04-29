import { fetchRecentPapers } from '../clients/arxiv.js';
import { supabase, log } from '../db.js';
import { env } from '../env.js';
import { extractGithubFromText } from '../lib/githubExtract.js';

export async function pollArxivNewPapers() {
  const task = 'pollArxivNewPapers';
  try {
    // 72h window: arxiv's daily release drops at ~00:30 UTC and papers'
    // `published` timestamps are from the original submission time, not
    // the listing time. A wider window guarantees we catch the most
    // recent batch plus the previous one regardless of when we boot.
    // Upserts are idempotent so redundant fetches are cheap.
    const sinceIso = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
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

    // Authors often paste a github URL into the abstract — extract those at
    // ingestion so pollMetrics can start tracking stars on the very next tick.
    const githubLinks = papers
      .map((p) => {
        const gh = extractGithubFromText(p.abstract);
        if (!gh) return null;
        return {
          arxiv_id: p.arxiv_id,
          source: 'github' as const,
          url: gh.url,
          external_id: `${gh.owner}/${gh.name}`,
          metadata: { owner: gh.owner, name: gh.name, via: 'arxiv_abstract' },
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    let githubAdded = 0;
    if (githubLinks.length) {
      const { error: linkErr, count: linkCount } = await supabase
        .from('paper_links')
        .upsert(githubLinks, {
          onConflict: 'arxiv_id,source,external_id',
          ignoreDuplicates: true,
          count: 'exact',
        });
      if (linkErr) {
        log(task, 'github link upsert err', { err: linkErr.message });
      } else {
        githubAdded = linkCount ?? 0;
      }
    }

    log(task, 'upserted', {
      attempted: rows.length,
      upserted: count ?? rows.length,
      githubLinksFound: githubLinks.length,
      githubLinksNew: githubAdded,
    });
  } catch (err) {
    log(task, 'ERROR', { message: (err as Error).message });
  }
}
