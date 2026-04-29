'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { generateTldr } from '@/lib/openai';

export type GenerateResult =
  | { ok: true; tldr: string }
  | { ok: false; error: string };

export async function generateSummary(arxivId: string): Promise<GenerateResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Sign in to generate summaries.' };

  const { data: paper } = await supabase
    .from('papers')
    .select('arxiv_id, title, abstract, tldr')
    .eq('arxiv_id', arxivId)
    .maybeSingle();
  if (!paper) return { ok: false, error: 'Paper not found.' };

  if (paper.tldr) return { ok: true, tldr: paper.tldr };

  let tldr: string;
  try {
    tldr = await generateTldr({ title: paper.title, abstract: paper.abstract });
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  // RLS-safe write: a SECURITY DEFINER function owned by postgres updates only
  // the tldr column, and only when it was NULL — no service role key needed.
  const { error } = await supabase.rpc('set_paper_tldr_if_null', {
    p_arxiv_id: arxivId,
    p_tldr: tldr,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/paper/${arxivId}`);
  return { ok: true, tldr };
}
