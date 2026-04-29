import 'server-only';
import { createClient } from '@/lib/supabase/server';

const FIGURE_FETCH_TIMEOUT_MS = 4000;

async function fetchWithTimeout(url: string): Promise<Response | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FIGURE_FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      headers: { 'User-Agent': 'research-pulse/0.1 (+figure-fetcher)' },
      signal: ctrl.signal,
      // Cache responses for a day so the same arxiv page isn't refetched
      // across many concurrent renders.
      next: { revalidate: 86400 },
    });
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function resolveUrl(src: string, baseUrl: string): string {
  try {
    return new URL(src, baseUrl).href;
  } catch {
    return src;
  }
}

function isLikelyFigure(src: string): boolean {
  const lower = src.toLowerCase();
  // Skip math equations, logos, icons, sprites, navigation chrome
  if (/(equation|inline|logo|icon|sprite|favicon|arxiv-vanity)/i.test(lower)) return false;
  // Want actual image extensions
  return /\.(png|jpe?g|webp|svg)(\?|$)/i.test(lower);
}

async function fromArxivHtml(arxivId: string): Promise<string | null> {
  const baseUrl = `https://arxiv.org/html/${arxivId}`;
  const res = await fetchWithTimeout(baseUrl);
  if (!res || !res.ok) return null;
  const html = await res.text();
  const re = /<img[^>]+src\s*=\s*["']([^"']+)["']/gi;
  for (const m of html.matchAll(re)) {
    const src = m[1];
    if (!isLikelyFigure(src)) continue;
    return resolveUrl(src, baseUrl + '/');
  }
  return null;
}

async function fromHuggingFaceOg(arxivId: string): Promise<string | null> {
  const res = await fetchWithTimeout(`https://huggingface.co/papers/${arxivId}`);
  if (!res || !res.ok) return null;
  const html = await res.text();
  const m = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
  if (!m) return null;
  // HF's default OG image for papers without a custom thumbnail is the generic
  // HuggingFace logo — not what we want. Filter that out.
  const url = m[1];
  if (/huggingface\.co\/.*(?:thumbnail|og-image)/i.test(url)) return url;
  if (/cdn-uploads\.huggingface\.co/i.test(url)) return url;
  return null;
}

export async function fetchFirstFigureUrl(arxivId: string): Promise<string | null> {
  return (await fromArxivHtml(arxivId)) ?? (await fromHuggingFaceOg(arxivId));
}

/**
 * Returns a cached figure URL for the paper, fetching one on first miss.
 * Subsequent calls (any user, any page) read from `papers.figure_url`.
 */
export async function ensurePaperFigure(arxivId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: paper } = await supabase
    .from('papers')
    .select('figure_url, figure_checked_at')
    .eq('arxiv_id', arxivId)
    .maybeSingle();
  if (!paper) return null;
  if (paper.figure_checked_at) return paper.figure_url;

  const url = await fetchFirstFigureUrl(arxivId);
  // Best-effort write; failure here is non-fatal — next render will retry.
  await supabase.rpc('set_paper_figure', { p_arxiv_id: arxivId, p_url: url });
  return url;
}
