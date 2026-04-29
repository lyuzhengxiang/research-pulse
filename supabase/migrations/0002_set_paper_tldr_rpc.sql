-- A SECURITY DEFINER function lets authenticated users fill in a missing TLDR
-- without granting them general UPDATE on papers. The function:
--   * runs as the function owner (bypasses RLS for this one query)
--   * only updates the `tldr` column
--   * only when the existing value is NULL (idempotent, no overwrites)
--   * is callable only by the `authenticated` role (anon cannot reach it)
create or replace function public.set_paper_tldr_if_null(
  p_arxiv_id text,
  p_tldr     text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  rows_changed int;
begin
  if p_tldr is null or length(trim(p_tldr)) = 0 then
    return false;
  end if;

  update public.papers
     set tldr = p_tldr
   where arxiv_id = p_arxiv_id
     and tldr is null;

  get diagnostics rows_changed = row_count;
  return rows_changed > 0;
end;
$$;

revoke all on function public.set_paper_tldr_if_null(text, text) from public, anon;
grant execute on function public.set_paper_tldr_if_null(text, text) to authenticated;
