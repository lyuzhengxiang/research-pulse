-- ============================================================================
-- Research Pulse — initial schema
-- Run this via Supabase SQL Editor or `supabase db push` after `supabase init`.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.papers (
  arxiv_id         text primary key,
  title            text not null,
  authors          text[] not null default '{}',
  abstract         text not null default '',
  primary_category text not null,
  categories       text[] not null default '{}',
  published_at     timestamptz not null,
  tldr             text,
  pulse_score      double precision not null default 0,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);

create index if not exists papers_published_at_idx
  on public.papers (published_at desc);
create index if not exists papers_pulse_score_idx
  on public.papers (pulse_score desc);
create index if not exists papers_is_active_idx
  on public.papers (is_active) where is_active = true;
create index if not exists papers_categories_gin
  on public.papers using gin (categories);
create index if not exists papers_authors_gin
  on public.papers using gin (authors);

create table if not exists public.paper_links (
  id              bigserial primary key,
  arxiv_id        text not null references public.papers(arxiv_id) on delete cascade,
  source          text not null check (source in ('github', 'hn', 'paperswithcode')),
  url             text not null,
  external_id     text not null,
  metadata        jsonb,
  discovered_at   timestamptz not null default now(),
  unique (arxiv_id, source, external_id)
);

create index if not exists paper_links_arxiv_id_idx
  on public.paper_links (arxiv_id);

create table if not exists public.paper_metrics (
  id            bigserial primary key,
  arxiv_id      text not null references public.papers(arxiv_id) on delete cascade,
  source        text not null check (source in ('github', 'hn')),
  metric        text not null check (metric in ('stars', 'hn_score', 'hn_comments')),
  value         integer not null,
  recorded_at   timestamptz not null default now()
);

create index if not exists paper_metrics_lookup_idx
  on public.paper_metrics (arxiv_id, metric, recorded_at desc);

create table if not exists public.user_subscriptions (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  sub_type    text not null check (sub_type in ('keyword', 'author', 'category')),
  value       text not null,
  created_at  timestamptz not null default now(),
  unique (user_id, sub_type, value)
);

create index if not exists user_subscriptions_user_idx
  on public.user_subscriptions (user_id);

create table if not exists public.user_starred_papers (
  user_id     uuid not null references auth.users(id) on delete cascade,
  arxiv_id    text not null references public.papers(arxiv_id) on delete cascade,
  starred_at  timestamptz not null default now(),
  primary key (user_id, arxiv_id)
);

create index if not exists user_starred_papers_paper_idx
  on public.user_starred_papers (arxiv_id);

create table if not exists public.user_alerts (
  id            bigserial primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  arxiv_id      text not null references public.papers(arxiv_id) on delete cascade,
  alert_type    text not null check (alert_type in ('star_surge', 'new_hn_discussion', 'new_match')),
  payload       jsonb not null default '{}'::jsonb,
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists user_alerts_user_unread_idx
  on public.user_alerts (user_id, created_at desc) where read_at is null;

-- ---------------------------------------------------------------------------
-- Materialized support: trending keywords view for autocomplete
-- (Simple tsvector-based extraction of frequent tokens in recent papers.)
-- ---------------------------------------------------------------------------

create or replace view public.trending_keywords as
with tokens as (
  select unnest(regexp_split_to_array(
           lower(regexp_replace(title || ' ' || coalesce(abstract, ''), '[^a-zA-Z\s]', ' ', 'g')),
           '\s+')) as word
  from public.papers
  where published_at >= now() - interval '30 days'
)
select word, count(*) as freq
from tokens
where length(word) >= 4
  and word !~ '^(the|and|for|with|that|this|from|which|using|based|paper|model|method|show|neural|learning|deep|large)$'
group by word
having count(*) >= 3
order by freq desc
limit 200;

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------

alter table public.papers           enable row level security;
alter table public.paper_links      enable row level security;
alter table public.paper_metrics    enable row level security;
alter table public.user_subscriptions enable row level security;
alter table public.user_starred_papers enable row level security;
alter table public.user_alerts      enable row level security;

-- Drop-then-create so the migration is idempotent when re-run.
drop policy if exists "papers are readable by everyone" on public.papers;
drop policy if exists "paper_links are readable by everyone" on public.paper_links;
drop policy if exists "paper_metrics are readable by everyone" on public.paper_metrics;
drop policy if exists "users manage own subscriptions" on public.user_subscriptions;
drop policy if exists "users manage own stars" on public.user_starred_papers;
drop policy if exists "users read own alerts" on public.user_alerts;
drop policy if exists "users mark own alerts read" on public.user_alerts;

-- Public read for paper-related tables
create policy "papers are readable by everyone"
  on public.papers for select using (true);

create policy "paper_links are readable by everyone"
  on public.paper_links for select using (true);

create policy "paper_metrics are readable by everyone"
  on public.paper_metrics for select using (true);

-- User-owned tables: only the owner can read/write their rows
create policy "users manage own subscriptions"
  on public.user_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users manage own stars"
  on public.user_starred_papers for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users read own alerts"
  on public.user_alerts for select
  using (auth.uid() = user_id);

create policy "users mark own alerts read"
  on public.user_alerts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- The worker uses the service_role key, which bypasses RLS entirely.
-- No INSERT/UPDATE policies needed for papers/paper_links/paper_metrics/user_alerts.

-- ---------------------------------------------------------------------------
-- Realtime: add tables to the supabase_realtime publication
-- ---------------------------------------------------------------------------

-- `alter publication ... add table` errors if the table is already a member,
-- so guard each with a DO block that checks pg_publication_tables first.
do $$
declare
  t text;
begin
  foreach t in array array['papers', 'paper_links', 'paper_metrics', 'user_alerts']
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
