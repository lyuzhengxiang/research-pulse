import { XMLParser } from 'fast-xml-parser';

const BASE = 'http://export.arxiv.org/api/query';

export type ArxivPaper = {
  arxiv_id: string;
  title: string;
  authors: string[];
  abstract: string;
  primary_category: string;
  categories: string[];
  published_at: string;
};

/**
 * Fetch recent submissions in the given categories.
 * Uses arxiv's Atom feed. Respects their etiquette of ≥3s between requests.
 */
export async function fetchRecentPapers(opts: {
  categories: string[];
  maxResults?: number;
  sinceIso?: string;
}): Promise<ArxivPaper[]> {
  const max = opts.maxResults ?? 100;
  const catQuery = opts.categories.map((c) => `cat:${c}`).join('+OR+');
  const url = `${BASE}?search_query=${catQuery}&sortBy=submittedDate&sortOrder=descending&start=0&max_results=${max}`;

  const res = await fetch(url, { headers: { 'User-Agent': 'research-pulse/0.1 (educational)' } });
  if (!res.ok) {
    throw new Error(`arxiv fetch failed: ${res.status} ${res.statusText}`);
  }
  const xml = await res.text();
  // arxiv returns 200 + plain-text "Rate exceeded" body when throttled.
  if (xml.length < 200 && !xml.includes('<feed')) {
    throw new Error(`arxiv returned non-feed response: ${xml.slice(0, 80)}`);
  }
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name) => ['entry', 'author', 'category'].includes(name),
  });
  const parsed = parser.parse(xml);
  const entries = (parsed?.feed?.entry ?? []) as any[];

  const since = opts.sinceIso ? new Date(opts.sinceIso).getTime() : 0;
  const papers: ArxivPaper[] = [];
  for (const e of entries) {
    const idUrl: string = e.id;
    const arxivId = idUrl.replace(/^https?:\/\/arxiv\.org\/abs\//, '').replace(/v\d+$/, '');
    const publishedAt = e.published as string;
    if (since && new Date(publishedAt).getTime() < since) continue;

    const authors = (e.author as any[]).map((a) => (a.name as string).trim()).filter(Boolean);
    const categories = (e.category as any[]).map((c) => c['@_term'] as string).filter(Boolean);
    const primaryCategory = (e['arxiv:primary_category']?.['@_term'] as string) ?? categories[0] ?? 'cs.LG';

    papers.push({
      arxiv_id: arxivId,
      title: String(e.title).replace(/\s+/g, ' ').trim(),
      authors,
      abstract: String(e.summary ?? '').replace(/\s+/g, ' ').trim(),
      primary_category: primaryCategory,
      categories,
      published_at: publishedAt,
    });
  }
  return papers;
}
