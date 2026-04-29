alter table public.papers
  add column if not exists figure_url text,
  add column if not exists figure_checked_at timestamptz;

-- Cache the first figure of an arXiv paper (fetched lazily on first view).
-- Restricted to known image hosts so anon callers can't inject arbitrary URLs.
-- Idempotent: only writes when figure_checked_at is NULL.
create or replace function public.set_paper_figure(
  p_arxiv_id text,
  p_url      text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  rows_changed int;
begin
  -- Allow NULL (means "we checked and no figure was found, don't recheck").
  if p_url is not null then
    if not (
      p_url ~* '^https?://([a-z0-9-]+\.)*(arxiv\.org|huggingface\.co|ar5iv\.labs\.arxiv\.org)/'
    ) then
      return false;
    end if;
  end if;

  update public.papers
     set figure_url = p_url,
         figure_checked_at = now()
   where arxiv_id = p_arxiv_id
     and figure_checked_at is null;

  get diagnostics rows_changed = row_count;
  return rows_changed > 0;
end;
$$;

revoke all on function public.set_paper_figure(text, text) from public;
grant execute on function public.set_paper_figure(text, text) to anon, authenticated;
