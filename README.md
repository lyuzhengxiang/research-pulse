# Research Pulse

Realtime tracker for AI/ML research papers. See papers rise from arXiv → GitHub → Hacker News with live metrics and personalized alerts.

**Stack**: Next.js 16 · Tailwind · Supabase (Postgres + Realtime + Auth) · Node worker on Railway · OpenAI gpt-5.4 for on-demand TLDRs.

## Monorepo layout

```
apps/
  web/      Next.js frontend (deploy: Vercel)
  worker/   Background poller (deploy: Railway)
packages/
  shared/   Shared TS types
supabase/
  migrations/
```

## Local dev

```bash
# 1. Install
npm install

# 2. Copy env files (different vars go to different sides — see .env.example)
cp .env.example apps/web/.env.local
cp .env.example apps/worker/.env
# Web needs:    NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, OPENAI_API_KEY
# Worker needs: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GITHUB_TOKEN

# 3. Apply DB migrations in Supabase (via SQL editor or the Supabase MCP)
ls supabase/migrations    # 0001_init.sql, 0002_set_paper_tldr_rpc.sql

# 4. Run
npm run dev:web        # → http://localhost:3000  (hot-reloads on save)
npm run dev:worker     # in another terminal — runs all 6 cron tasks
```

> ⚠️ The local `.env.local` points at the **same Supabase project as production** by default. Anything you do locally (star a paper, generate a TLDR) writes to the live DB. For a clean sandbox, create a separate Supabase project, apply the migrations there, and use those credentials locally.

### Verifying changes locally

```bash
npm run typecheck                    # tsc --noEmit across all workspaces
npm run build:web                    # full Next build — catches issues dev mode hides
```

### Running a single worker task manually (skip the cron wait)

```bash
cd apps/worker
npm run task:run -- pollArxivNewPapers
npm run task:run -- detectStarSurgeAlerts
npm run task:run -- computePulseScore
# Available: pollArxivNewPapers, generateTldrsForNewPapers, findGithubRepos,
#            pollActivePaperMetrics, detectStarSurgeAlerts, computePulseScore,
#            deactivateStalePapers
```

`generateTldrsForNewPapers` is no longer scheduled (TLDRs are user-triggered via the Generate Summary button) — but you can still run it manually if you ever want to backfill.

See [CLAUDE.md](./CLAUDE.md) for full architecture.
