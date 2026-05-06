-- ============================================================================
-- Denormalize reaction count onto papers so we can sort + display in O(1).
--   * papers.reaction_count integer
--   * trigger keeps it in sync with paper_reactions INSERT/DELETE
--   * indexes on view_count desc and reaction_count desc for "most viewed" /
--     "most reacted" sort tabs on /trending
-- ============================================================================

alter table public.papers
  add column if not exists reaction_count integer not null default 0;

-- Backfill from existing paper_reactions
update public.papers p
   set reaction_count = coalesce(rc.cnt, 0)
  from (
    select arxiv_id, count(*)::int as cnt
    from public.paper_reactions
    group by arxiv_id
  ) rc
 where rc.arxiv_id = p.arxiv_id;

-- Maintain the counter from now on
create or replace function public.bump_paper_reaction_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.papers
       set reaction_count = reaction_count + 1
     where arxiv_id = NEW.arxiv_id;
    return NEW;
  elsif (tg_op = 'DELETE') then
    update public.papers
       set reaction_count = greatest(0, reaction_count - 1)
     where arxiv_id = OLD.arxiv_id;
    return OLD;
  end if;
  return null;
end;
$$;

drop trigger if exists paper_reactions_count_trg on public.paper_reactions;
create trigger paper_reactions_count_trg
after insert or delete on public.paper_reactions
for each row execute function public.bump_paper_reaction_count();

create index if not exists papers_view_count_idx
  on public.papers (view_count desc) where is_active = true;
create index if not exists papers_reaction_count_idx
  on public.papers (reaction_count desc) where is_active = true;
