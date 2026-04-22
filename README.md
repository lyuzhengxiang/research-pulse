# Research Pulse

Realtime tracker for AI/ML research papers. See papers rise from arXiv → GitHub → Hacker News with live metrics and personalized alerts.

**Stack**: Next.js 16 · Tailwind · Supabase (Postgres + Realtime + Auth) · Node worker on Railway · OpenAI gpt-5.4 for TLDRs (optional).

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

# 2. Copy env files
cp .env.example apps/web/.env.local
cp .env.example apps/worker/.env
# fill in Supabase / GitHub / OpenAI credentials

# 3. Apply DB migration in Supabase (via SQL editor or MCP)
cat supabase/migrations/0001_init.sql

# 4. Run
npm run dev:worker   # in one terminal
npm run dev:web      # in another
```

See [CLAUDE.md](./CLAUDE.md) for full architecture.
