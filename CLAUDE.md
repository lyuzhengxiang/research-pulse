# Research Pulse

A realtime dashboard that tracks AI/ML papers from the moment they hit arXiv through their adoption on GitHub and discussion on Hacker News. Users subscribe to keywords, authors, and categories and get a personalized live feed with AI-generated TLDRs and rising-star alerts.

## Architecture

```
External APIs                 Worker (Railway)           Database (Supabase)           Frontend (Vercel)
─────────────                 ───────────────            ────────────────────          ─────────────────
arXiv API           ──┐
Paperswithcode API    │       Node/TS process
GitHub REST API       ├──▶    node-cron tasks   ──▶     Postgres + Realtime   ──▶     Next.js 14
HN Algolia API        │       (poll / tldr /            (6 tables, RLS)                App Router
OpenAI gpt-5.4 (TLDR) ┘        metrics / alerts)                                       Tailwind, Recharts
                                                                                       Supabase Auth
```

## Services

### Worker (`apps/worker/`)
A single Node/TypeScript process on Railway running seven scheduled tasks via `node-cron`:

| Task | Cron | Responsibility |
|------|------|----------------|
| `pollArxivNewPapers` | `*/30 * * * *` | Fetch new papers from AI/ML arXiv categories, upsert `papers` |
| `generateTldrsForNewPapers` | `*/5 * * * *` | Call OpenAI gpt-5.4 to generate 2–3 line TLDRs |
| `findGithubRepos` | `*/30 * * * *` | Map papers → official GitHub repos via paperswithcode |
| `pollActivePaperMetrics` | `*/15 * * * *` | Fetch GitHub stars + HN Algolia score/comments for active papers |
| `detectStarSurgeAlerts` | `*/15 * * * *` | Emit alerts when star velocity spikes on a user's starred paper |
| `computePulseScore` | `0 * * * *` | Update `papers.pulse_score` from weighted velocity metrics |
| `deactivateStalePapers` | `0 3 * * *` | Nightly: stop polling papers > 7 days old with no user interest |

Rate limits: GitHub PAT 5k/hr, arXiv 3s inter-request delay, HN Algolia unrestricted, OpenAI gpt-5.4 for TLDR (optional).

### Database (`supabase/`)
Postgres + Realtime. Six tables:

- `papers` — arxiv_id (PK), title, authors[], abstract, categories[], `tldr`, `pulse_score`, `is_active`
- `paper_links` — (paper_id, source, external_id) linking papers to GitHub repos & HN stories
- `paper_metrics` — time-series of stars / hn_score / hn_comments
- `user_subscriptions` — keyword / author / category subscriptions
- `user_starred_papers` — papers a user bookmarked
- `user_alerts` — system-generated notifications (star surge, new discussion)

Realtime enabled on: `papers`, `paper_metrics`, `paper_links`, `user_alerts`.

RLS: public read on paper-related tables; `auth.uid() = user_id` on user-owned tables; worker bypasses with service role key.

### Frontend (`apps/web/`)
Next.js 14 App Router, Tailwind, shadcn/ui, Recharts, Supabase Auth.

| Route | Description |
|-------|-------------|
| `/` | Personalized feed sorted by pulse_score |
| `/paper/[arxivId]` | Detail with timeline chart (stars + HN score over time) |
| `/trending` | Globally hottest papers right now |
| `/watchlist` | User's starred papers + alerts |
| `/settings` | Manage keyword / author / category subscriptions |
| `/sign-in`, `/sign-up` | Supabase Auth UI |

Realtime pattern: each client subscribes to `postgres_changes` filtered by arxiv_id or user_id, so new metric rows and alerts appear without reload.

## Data flow (single paper, end-to-end)

1. `pollArxivNewPapers` discovers new paper `2404.12345`, upserts row with `tldr=NULL`.
2. Realtime pushes INSERT to every web client with a matching subscription; card renders with `[TLDR generating…]`.
3. `generateTldrsForNewPapers` (~5 min later) fills TLDR; Realtime UPDATE refreshes the card.
4. `findGithubRepos` queries paperswithcode → inserts `paper_links` row → card shows repo badge.
5. `pollActivePaperMetrics` starts recording `paper_metrics` rows every 15 min.
6. User stars the paper. `detectStarSurgeAlerts` now watches it; if stars gain >3× baseline in 1h, a `user_alerts` row is inserted → AlertBell lights up in realtime.
7. `/paper/[arxivId]` renders a Recharts line of all `paper_metrics`; new points appear live.
8. After 7 days with no user interest, `deactivateStalePapers` flips `is_active=false` and metrics polling stops.

## Environment variables

See `.env.example`. Web needs `NEXT_PUBLIC_SUPABASE_*`; worker needs service role key, GitHub PAT, and OpenAI key (optional).

## Deployment

- **Supabase**: migration applied via Supabase MCP; realtime toggled on 4 tables.
- **Vercel**: connects to repo, builds `apps/web/`.
- **Railway**: connects to same repo, builds `apps/worker/`, runs `node dist/index.js`.
- **Supabase MCP** for dev-time DB operations: `claude mcp add --transport http supabase https://mcp.supabase.com/mcp`.
