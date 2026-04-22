import { env } from '../env.js';

const API = 'https://api.github.com';

export async function fetchRepoStars(owner: string, name: string): Promise<number | null> {
  const res = await fetch(`${API}/repos/${owner}/${name}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'research-pulse/0.1',
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`github fetch failed: ${res.status} for ${owner}/${name}`);
  }
  const body = (await res.json()) as any;
  return Number(body.stargazers_count ?? 0);
}
