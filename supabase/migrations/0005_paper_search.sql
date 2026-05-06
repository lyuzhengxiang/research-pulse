-- ============================================================================
-- Full-text search on papers
--   * search_vector — generated tsvector over title + abstract
--   * GIN index on search_vector
--   * search_papers(q, lim) RPC — ranked by ts_rank desc, pulse_score desc
-- ============================================================================

alter table public.papers
  add column if not exists search_vector tsvector
  generated always as (
    to_tsvector('english',
      coalesce(title, '') || ' ' || coalesce(abstract, ''))
  ) stored;

create index if not exists papers_search_vector_idx
  on public.papers using gin (search_vector);

-- websearch_to_tsquery is the user-friendly query parser:
--   "transformer" exact-phrase
--   -bert       negation
--   foo OR bar  alternation
-- It tolerates whatever a casual searcher types.
create or replace function public.search_papers(
  p_query text,
  p_limit int default 50
) returns setof public.papers
language sql
stable
security invoker
set search_path = public
as $$
  select p.*
  from public.papers p
  where p.search_vector @@ websearch_to_tsquery('english', p_query)
  order by ts_rank(p.search_vector, websearch_to_tsquery('english', p_query)) desc,
           p.pulse_score desc
  limit greatest(1, least(p_limit, 200));
$$;

revoke all on function public.search_papers(text, int) from public;
grant execute on function public.search_papers(text, int) to anon, authenticated;
