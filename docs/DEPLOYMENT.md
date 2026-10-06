# Deployment and operations

## Local startup

Install Node.js 24+ and pnpm 11.25.0. From the extracted project directory:

```bash
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
cp .env.example .dev.vars
pnpm setup:local
pnpm start
```

Open http://localhost:4173. Windows PowerShell uses `Copy-Item .env.example .dev.vars`. `setup:local` builds and applies tracked migrations. `start` checks migrations again and serves the production Worker build with local D1. Retain `.wrangler/state` to keep local data. No external API key or separate database server is needed. Use `pnpm dev` for development after database setup.

## Hosted application

The primary target is Cloudflare Workers-compatible output with managed D1. The registered deployment configuration is `.openai/hosting.json`. The managed release workflow pushes the matching source commit, packages `dist/server`, client assets and migrations, and publishes to the existing private audience. Private hosting access and in-application user/admin authorization are separate boundaries.

The main account/fitness API runs TypeScript in Workers. The included FastAPI service is optional and may run separately; it is not falsely represented as the hosted main backend. Configure optional LLM secrets only in the server environment. Demo workspaces are individually isolated; set `DEMO_MODE=false` to prevent new demos.

## Containers

```bash
docker compose up --build
docker compose --profile integration up --build
docker compose --profile iot up --build
```

The application container runs local Wrangler/Miniflare for a reproducible demonstration with persistent SQLite. It is not a substitute for the managed production runtime. The optional Python service is bearer protected. The MQTT profile exposes only the local broker port. Container files are included; Docker execution requires a Docker daemon and is tracked separately from app build verification.

## Migrations, backup and rollback

Edit `db/schema.ts`, run `pnpm db:generate`, review SQL and apply `pnpm db:migrate` locally before releasing. Never regenerate an initial migration to modify an already-populated deployment. Back up persistent local state while the local app is stopped; for hosted D1 use the hosting provider's export/restore controls. Keep backups private because they contain fitness records. Test restoration separately before relying on it.

Rollback application code to a known matching release. A code rollback does not undo data migrations: use an explicitly reviewed forward repair migration or a tested backup restoration. Never run destructive database resets as an application startup step.

## Health and checks

`GET /api/health` checks the actual binding. Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`; install the Python lock and run `.venv/bin/python scripts/verify-built.py` for a production-build HTTP smoke check. This POSIX verification helper creates/removes isolated test workspaces and shuts down its own server. The normal application startup works independently of this helper.

Camera use requires HTTPS or localhost, a connected camera, permission and WebGL 2. Guided buddy, replay, manual logging, nutrition and analytics work without a camera, GPU, paid API, maps account or physical equipment.
