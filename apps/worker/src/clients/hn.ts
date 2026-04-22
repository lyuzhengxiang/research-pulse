/**
 * Hacker News via Algolia search API.
 * Searches for stories linking to arxiv.org/abs/{id}.
 * Free, no auth, no rate-limit in practice.
 */

export type HnStory = {
  story_id: string;
  url: string;
  title: string;
  points: number;
  num_comments: number;
  created_at: string;
};

export async function searchHnForArxivId(arxivId: string): Promise<HnStory | null> {
  const query = `arxiv.org/abs/${arxivId}`;
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=3`;
  const res = await fetch(url, { headers: { 'User-Agent': 'research-pulse/0.1' } });
  if (!res.ok) return null;
  const body = (await res.json()) as any;
  const hits = (body?.hits ?? []) as any[];
  if (!hits.length) return null;

  // Pick the hit that actually links to this arxiv-id and has the highest points.
  const matches = hits.filter((h) => {
    const u: string = h.url ?? '';
    return u.includes(`arxiv.org/abs/${arxivId}`) || u.includes(`arxiv.org/pdf/${arxivId}`);
  });
  const best = (matches.length ? matches : hits).sort(
    (a, b) => (b.points ?? 0) - (a.points ?? 0),
  )[0];
  if (!best) return null;

  return {
    story_id: String(best.objectID),
    url: `https://news.ycombinator.com/item?id=${best.objectID}`,
    title: String(best.title ?? ''),
    points: Number(best.points ?? 0),
    num_comments: Number(best.num_comments ?? 0),
    created_at: String(best.created_at ?? new Date().toISOString()),
  };
}
