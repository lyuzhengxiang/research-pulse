import 'dotenv/config';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const env = {
  SUPABASE_URL: required('SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY: required('SUPABASE_SERVICE_ROLE_KEY'),
  GITHUB_TOKEN: required('GITHUB_TOKEN'),
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? '',
  ARXIV_CATEGORIES: (process.env.ARXIV_CATEGORIES ?? 'cs.AI,cs.LG,cs.CL,cs.CV,stat.ML')
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean),
  ACTIVE_WINDOW_DAYS: Number(process.env.ACTIVE_WINDOW_DAYS ?? 7),
};
