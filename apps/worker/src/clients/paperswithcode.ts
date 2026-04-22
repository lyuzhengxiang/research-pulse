/**
 * Paperswithcode has a public API at https://paperswithcode.com/api/v1/
 * For a given arxiv id, we hit /papers/?arxiv_id={id} and then fetch repositories.
 */

export type PwcRepo = {
  url: string;
  owner: string;
  name: string;
  stars: number;
  is_official: boolean;
};

export async function findRepoForArxivId(arxivId: string): Promise<PwcRepo | null> {
  const searchUrl = `https://paperswithcode.com/api/v1/papers/?arxiv_id=${encodeURIComponent(arxivId)}`;
  const searchRes = await fetch(searchUrl, {
    headers: { Accept: 'application/json', 'User-Agent': 'research-pulse/0.1' },
  });
  if (!searchRes.ok) return null;
  const body = (await searchRes.json()) as any;
  const paper = body?.results?.[0];
  if (!paper?.id) return null;

  const reposUrl = `https://paperswithcode.com/api/v1/papers/${paper.id}/repositories/`;
  const reposRes = await fetch(reposUrl, {
    headers: { Accept: 'application/json', 'User-Agent': 'research-pulse/0.1' },
  });
  if (!reposRes.ok) return null;
  const reposBody = (await reposRes.json()) as any;
  const repos = (reposBody?.results ?? []) as any[];
  if (!repos.length) return null;

  const official = repos.find((r) => r.is_official) ?? repos[0];
  const urlStr = String(official.url ?? '');
  const match = urlStr.match(/github\.com\/([^/]+)\/([^/?#]+)/i);
  if (!match) return null;
  return {
    url: urlStr,
    owner: match[1],
    name: match[2].replace(/\.git$/, ''),
    stars: Number(official.stars ?? 0),
    is_official: Boolean(official.is_official),
  };
}
