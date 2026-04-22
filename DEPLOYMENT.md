# Deployment Guide

Step-by-step to get Research Pulse running in production.

## 1. Supabase

1. Go to [supabase.com](https://supabase.com/dashboard), click **New project**.
2. Name: `research-pulse`. Pick any region. Save the DB password somewhere.
3. Once the project provisions, grab from **Settings → API**:
   - `Project URL` → `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` *(keep secret — worker only)*
4. **SQL Editor** → New query → paste the contents of [supabase/migrations/0001_init.sql](./supabase/migrations/0001_init.sql) → **Run**.
5. Verify **Database → Replication** shows `papers`, `paper_links`, `paper_metrics`, `user_alerts` under `supabase_realtime` publication (the migration adds them).
6. **Authentication → Providers**: keep **Email** enabled. Disable "Confirm email" if you want magic links to work instantly without email verification friction.
7. **Authentication → URL Configuration**: add your Vercel URL to **Redirect URLs** (e.g. `https://research-pulse.vercel.app/auth/callback`). Also add `http://localhost:3000/auth/callback` for local dev.

## 2. GitHub

1. Create a new public GitHub repo (e.g. `research-pulse`).
2. From the project root:
   ```bash
   git init
   git add .
   git commit -m "init monorepo"
   git branch -M main
   git remote add origin git@github.com:YOURUSER/research-pulse.git
   git push -u origin main
   ```
3. Create a **Personal Access Token (classic)** at https://github.com/settings/tokens. Scope: `public_repo`. Save as `GITHUB_TOKEN`.

## 3. OpenAI API key (optional — for gpt-5.4 TLDRs)

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys), create an API key. Save as `OPENAI_API_KEY`.
2. If you skip this, the worker falls back to the first two sentences of each abstract as the TLDR. Everything else still works.

## 4. Vercel (frontend)

1. Go to [vercel.com/new](https://vercel.com/new), import the GitHub repo.
2. **Important monorepo settings**:
   - **Root Directory**: leave as repo root (or set to `/`). The `vercel.json` at root already handles install/build/output for the web workspace.
   - **Framework Preset**: Next.js (auto-detected)
3. **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy. Copy the resulting URL (e.g. `https://research-pulse.vercel.app`).
5. Add that URL to **Supabase → Authentication → URL Configuration → Redirect URLs** if you hadn't yet (with `/auth/callback` appended).

## 5. Railway (worker)

1. Go to [railway.app](https://railway.app/), **New Project → Deploy from GitHub repo**, pick the same repo.
2. Railway will detect Node; the included `apps/worker/railway.json` pins build/start commands.
   If Railway ignores the file, set:
   - Build Command: `npm install && npm run build --workspace=apps/worker`
   - Start Command: `node apps/worker/dist/index.js`
3. **Variables**:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GITHUB_TOKEN`
   - `OPENAI_API_KEY` (optional — skip for abstract-fallback TLDRs)
   - (optional) `ARXIV_CATEGORIES=cs.AI,cs.LG,cs.CL,cs.CV,stat.ML`
4. Deploy. Open the **Deploy logs** — within 30 seconds you should see:
   ```
   [...] [boot] research-pulse worker starting
   [...] [pollArxivNewPapers] upserted ...
   ```
5. Check Supabase → Table Editor → `papers` → rows are appearing.

## 6. Verify end-to-end

- Open your Vercel URL in a browser → sign in with magic link → go to `/settings` → pick a category + a keyword → back to `/` → matching papers should appear.
- Open a paper detail page → star it → watch the timeline chart. Wait 15 min and new data points appear live without refresh.
- Open the page in two browsers at once → when a metric row is inserted (either via worker or manually from Supabase dashboard), both should update within ~1s.

## 7. Local development

```bash
npm install
cp .env.example apps/web/.env.local   # fill NEXT_PUBLIC_SUPABASE_*
cp .env.example apps/worker/.env      # fill SUPABASE_URL, service role, github token, anthropic key

# terminal 1
npm run dev:worker

# terminal 2
npm run dev:web
```

Manually run a single worker task for debugging:

```bash
cd apps/worker
npm run task:run -- pollArxivNewPapers
npm run task:run -- findGithubRepos
npm run task:run -- pollActivePaperMetrics
```

## 8. Supabase MCP (dev-time)

```bash
claude mcp add --transport http supabase https://mcp.supabase.com/mcp
```

Then in Claude Code: ask for "list tables", "show last 5 rows of papers", etc.

## Troubleshooting

- **Realtime not updating on frontend**: verify `supabase_realtime` publication includes the tables (run `select * from pg_publication_tables where pubname='supabase_realtime';` in SQL editor).
- **Worker errors with `invalid auth token`**: you used the anon key instead of the service_role key.
- **Vercel build fails with "Cannot find module @research-pulse/shared"**: ensure your root `package.json` has `"workspaces": ["apps/*", "packages/*"]` and that `vercel.json`'s install command is `npm install` at repo root.
- **arxiv returns 0 entries**: occasionally their Atom endpoint rate-limits. The task logs an error but doesn't crash — it'll retry in 30 min.
