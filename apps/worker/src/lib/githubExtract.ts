// Extract a github repo (owner/name) from arbitrary text — typically an
// arXiv abstract, where authors often write "Code at https://github.com/..."
//
// Returns the FIRST plausible repo url, or null. We deliberately ignore
// reserved github.com paths that aren't user/repo URLs.

const RESERVED_OWNERS = new Set([
  'about',
  'enterprise',
  'features',
  'gist',
  'orgs',
  'pricing',
  'sponsors',
  'topics',
]);

const URL_RE =
  /https?:\/\/(?:www\.)?github\.com\/([A-Za-z0-9][A-Za-z0-9_.-]*)\/([A-Za-z0-9][A-Za-z0-9_.-]*?)(?:\.git)?(?=[\s)\]\.,;'"<>]|$)/gi;

export function extractGithubFromText(
  text: string | null | undefined,
): { owner: string; name: string; url: string } | null {
  if (!text) return null;
  for (const m of text.matchAll(URL_RE)) {
    const owner = m[1];
    let name = m[2];
    if (!owner || !name) continue;
    if (RESERVED_OWNERS.has(owner.toLowerCase())) continue;
    name = name.replace(/[).,;]+$/, ''); // strip trailing punctuation
    if (!name) continue;
    return {
      owner,
      name,
      url: `https://github.com/${owner}/${name}`,
    };
  }
  return null;
}
