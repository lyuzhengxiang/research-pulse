-- ============================================================================
-- Reactions + view counts
--   * paper_reactions  — public emoji reactions, stackable per user/kind
--   * paper_views      — per-user dedup table (so refresh doesn't inflate)
--   * papers.view_count — denormalized counter, bumped via RPC
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------

alter table public.papers
  add column if not exists view_count integer not null default 0;

create table if not exists public.paper_reactions (
  arxiv_id    text not null references public.papers(arxiv_id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('thumbs_up', 'fire', 'thinking', 'poop')),
  created_at  timestamptz not null default now(),
  primary key (arxiv_id, user_id, kind)
);

create index if not exists paper_reactions_arxiv_kind_idx
  on public.paper_reactions (arxiv_id, kind);

create table if not exists public.paper_views (
  arxiv_id    text not null references public.papers(arxiv_id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  viewed_at   timestamptz not null default now(),
  primary key (arxiv_id, user_id)
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.paper_reactions enable row level security;
alter table public.paper_views enable row level security;

drop policy if exists "paper_reactions are readable by everyone" on public.paper_reactions;
drop policy if exists "users add own reactions" on public.paper_reactions;
drop policy if exists "users remove own reactions" on public.paper_reactions;
drop policy if exists "users read own paper_views" on public.paper_views;

create policy "paper_reactions are readable by everyone"
  on public.paper_reactions for select using (true);

create policy "users add own reactions"
  on public.paper_reactions for insert
  with check (auth.uid() = user_id);

create policy "users remove own reactions"
  on public.paper_reactions for delete
  using (auth.uid() = user_id);

-- paper_views is internal book-keeping; we only let the owner read their own
-- rows (the RPC writes via SECURITY DEFINER).
create policy "users read own paper_views"
  on public.paper_views for select
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- record_paper_view RPC
--   * anonymous → bumps view_count by 1 (we can't dedup unauthenticated calls)
--   * authenticated → inserts into paper_views with ON CONFLICT DO NOTHING;
--     bumps view_count only when the row is genuinely new
-- Bypasses the lack of UPDATE policy on papers via SECURITY DEFINER.
-- ---------------------------------------------------------------------------

create or replace function public.record_paper_view(p_arxiv_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  is_new boolean := true;
begin
  if uid is not null then
    insert into public.paper_views (arxiv_id, user_id)
    values (p_arxiv_id, uid)
    on conflict (arxiv_id, user_id) do nothing;
    -- found is set by the latest INSERT/UPDATE; true iff a row was inserted.
    is_new := found;
  end if;

  if is_new then
    update public.papers
       set view_count = view_count + 1
     where arxiv_id = p_arxiv_id;
  end if;
end;
$$;

revoke all on function public.record_paper_view(text) from public;
grant execute on function public.record_paper_view(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['paper_reactions']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end$$;
