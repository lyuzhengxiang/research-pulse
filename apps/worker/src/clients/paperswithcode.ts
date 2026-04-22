/**
 * Paperswithcode.com was acquired by Hugging Face in early 2026 and
 * redirects to huggingface.co/papers/trending. We use HuggingFace's
 * Papers API instead: https://huggingface.co/api/papers/{arxiv_id}
 *
 * HF doesn't give us a direct paper→official-repo mapping, but it does
 * give us:
 *   - upvotes (live signal of community interest)
 *   - projectPage (often the paper's own GitHub or landing page)
 */

export type HfPaperInfo = {
  arxiv_id: string;
  upvotes: number;
  projectPage: string | null;
  title: string;
  found: boolean;
};

export async function fetchHfPaperInfo(arxivId: string): Promise<HfPaperInfo | null> {
  const url = `https://huggingface.co/api/papers/${encodeURIComponent(arxivId)}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'research-pulse/0.1' },
    });
  } catch {
    return null;
  }
  if (res.status === 404) return { arxiv_id: arxivId, upvotes: 0, projectPage: null, title: '', found: false };
  if (!res.ok) return null;

  const text = await res.text();
  if (!text.startsWith('{')) return null;
  try {
    const body = JSON.parse(text) as {
      id?: string;
      upvotes?: number;
      projectPage?: string;
      title?: string;
      error?: string;
    };
    if (body.error) {
      return { arxiv_id: arxivId, upvotes: 0, projectPage: null, title: '', found: false };
    }
    return {
      arxiv_id: body.id ?? arxivId,
      upvotes: Number(body.upvotes ?? 0),
      projectPage: body.projectPage ?? null,
      title: body.title ?? '',
      found: true,
    };
  } catch {
    return null;
  }
}

/**
 * Try to extract a GitHub repo URL from an HF paper's projectPage.
 * Returns null if projectPage isn't a GitHub URL.
 */
export function githubRepoFromProjectPage(projectPage: string | null): { owner: string; name: string; url: string } | null {
  if (!projectPage) return null;
  const match = projectPage.match(/github\.com\/([^/]+)\/([^/?#]+)/i);
  if (!match) return null;
  return {
    url: projectPage,
    owner: match[1],
    name: match[2].replace(/\.git$/, ''),
  };
}
