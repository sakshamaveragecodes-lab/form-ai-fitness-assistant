# FORM — AI Gym & Fitness Assistant

A complete fitness workspace built from the supplied **AI Gym & Fitness Assistant — Trivion** specification. FORM connects private camera coaching, nutrition planning, habit tracking, conversational guidance, performance analytics, recommendations and smart equipment in one responsive application.

## Start here

**Requirements:** Node.js 24+, pnpm 11.25.0, and a current desktop browser. Python 3.12 is needed only for the optional integration service and MQTT tools. A webcam requires HTTPS or localhost.

```bash
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
cp .env.example .dev.vars
pnpm setup:local
pnpm start
```

Open **http://localhost:4173**. `setup:local` builds the app and applies tracked SQLite migrations; `start` also checks migrations before serving. No paid API is required. On Windows use `Copy-Item .env.example .dev.vars` instead of `cp`.

Choose **Explore the demo** for a populated, private sample workspace, or **Explore admin sandbox** for an isolated administrator. Each click creates a separate tenant with an undisclosed generated password. There is no shared administrator password. Create a personal account to keep your own credentials; save the one-time recovery file before dismissing its dialog.

For frontend/backend development after database setup:

```bash
pnpm dev
```

The default development URL is http://localhost:5173. The same application serves the React UI and the `/api` backend; a second API server is unnecessary. `.dev.vars` supplies local Worker bindings. Data lives in `.wrangler/state`; keep it when restarting.

## What works

| Area | Implemented behavior |
|---|---|
| AI trainer | Local MediaPipe pose inference; side selection; squat, push-up, curl, press, lunge and plank; visible landmarks; angles; complete-cycle rep detection; sets/rest; actionable geometric cues; session persistence |
| Nutrition | Adult profile, BMI/BMR/TDEE, energy/macros, strict dietary/allergen filters, scaled recipes, food diary, grocery aggregation/checklist/export, clinical-case target pause |
| Habit tracker | Calendar, scheduled-session streaks, due-session consistency, explainable skip-risk index, rescheduling, recovery-paced adaptation, visit-based reminders and ICS reminders |
| Gym buddy | Persistent conversation, context-aware guided answers, lexical sentiment, safety routing; optional server-side OpenAI-compatible provider with per-user consent and graceful failure |
| Performance | Documented weighted movement score, exercise comparisons, charts, sample filtering, dated progress-report export |
| Discover | Goal/equipment/history/schedule plan matching, plan adoption, challenges, permission-based local distance sorting and clearly fictional gym examples |
| Smart equipment | Persisted readings, deterministic simulation, scoped device tokens/rotation/revocation, sequence validation, resistance/rest suggestions, MQTT simulator and durable HTTP bridge |
| Administration | Backend RBAC and tenant boundaries, member status/search/filter/pagination, content editors for six catalog categories, issues, announcements, equipment controls and audit trail |
| Accounts/privacy | Hashed passwords, opaque HttpOnly cookie sessions, rotation/revocation, recovery keys, onboarding, settings, data export and confirmed deletion |

Camera frames are processed in a browser worker and never uploaded. Synthetic replay is clearly marked and excluded from real activity/adherence. Manual workouts have no invented camera score. Seed history is labelled. Nutrition is educational estimation, not diagnosis or treatment.

## Architecture and stack decisions

React 19 + TypeScript + Vinext (Next.js-compatible routing), Radix/shadcn controls, Recharts, Zod, MediaPipe Tasks Vision, Cloudflare Workers, D1/SQLite, Drizzle schema/migrations, Vitest and React Testing Library. The lockfile records exact JavaScript dependency resolutions. A separate FastAPI integration service, Python numerical reference algorithms and Paho MQTT tools are included with a complete Python dependency lock.

The specification proposes Python and PostgreSQL. The available live hosting environment runs Workers with managed D1, so the **authoritative account/fitness backend is TypeScript**, with relational SQLite persistence. This enables a working integrated deployment rather than a frontend with an unhosted API. Python is a real, tested optional interoperability service; it is not presented as the main database backend. PostgreSQL, TensorFlow, PyTorch, S3 and trained habit models are not claimed. See [architecture](docs/ARCHITECTURE.md) and [algorithm cards](docs/ALGORITHMS.md).

## Repository map

| Path | Responsibility |
|---|---|
| `app/` | Application entry points, global design tokens/styles, API dispatch |
| `components/fitness/` | Independent product screens and reusable fitness controls |
| `components/ui/` | Shared accessible UI primitives |
| `lib/server/routes/` | Account, workout, nutrition, chat, equipment and admin APIs |
| `lib/server/` | Database access, validation, authorization, seeding and snapshots |
| `lib/algorithms/` | Pose geometry, nutrition, performance, habits and matching |
| `db/`, `drizzle/` | Relational schema, indexes, constraints and generated migration |
| `public/models/` | Bundled MediaPipe model/runtime assets for local inference |
| `backend/`, `ai/` | Optional FastAPI service and Python calculation references |
| `iot/` | HTTP/MQTT simulator and durable equipment gateway |
| `tests/`, `backend/tests/` | Executable calculation, component, API, RBAC and integration tests |
| `scripts/`, `docker/` | Setup, migrations, operator actions, packaging and broker configuration |
| `docs/` | API, security, academic report, requirements, operations and verification records |

## Database and seeding

```bash
pnpm db:generate   # only after editing db/schema.ts; review the generated SQL
pnpm db:migrate    # applies only unapplied migrations
```

The initial migration creates 18 application tables with foreign keys, indexes and bounded entity constraints. Wrangler records migration history separately. Registration atomically creates a workspace, user, profile and starter catalog; a seed failure removes the partially created workspace. Demo registration adds derived sample workout metrics, schedules, nutrition, a plan and a simulated device. Reopening an existing session does not reseed its data.

## Verification

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm audit --prod
python -m venv .venv
.venv/bin/pip install -r backend/requirements.lock
.venv/bin/python -m pytest backend/tests -q
```

On Windows replace `.venv/bin/` with `.venv/Scripts/`. API tests execute the actual route handlers against a real SQLite database initialized by the actual migration, adapting only the D1 binding. They are not mocked success responses. Browser observations and external constraints are recorded separately in [verification](docs/VERIFICATION.md).

## Optional Python integration

```bash
python -m venv .venv
.venv/bin/pip install -r backend/requirements.lock
# Set AI_SERVICE_TOKEN to a locally generated secret of at least 32 characters.
.venv/bin/python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

`/docs` provides interactive OpenAPI documentation. `/v1/nutrition/estimate` and `/v1/performance/score` require the service bearer token. `/v1/telemetry` forwards a scoped `Device` token to the main application, which verifies ownership, revocation and sequence numbers. No second account database is created. See [IoT](docs/IOT.md).

## Configuration

Copy the provided `.env.example` to `.dev.vars` for local application secrets. Do not commit populated files. Hosted secrets are configured in the hosting provider, not source code.

| Variable | Purpose |
|---|---|
| `DEMO_MODE` | `true` for isolated demos; set `false` for a deployment without demo creation |
| `LLM_API_KEY` | Optional server-only chat credential; absent means guided mode |
| `LLM_BASE_URL`, `LLM_MODEL` | Compatible Chat Completions endpoint and model; defaults shown in the example |
| `AI_SERVICE_TOKEN` | Required secret for Python numerical endpoints; absent/short means closed access |
| `FORM_BASE_URL` | Trusted main application origin for Python/MQTT forwarding |
| `FORM_DEVICE_ID`, `FORM_DEVICE_TOKEN` | Simulator identity and scoped token issued in Smart equipment |
| `FORM_DEVICE_TOKENS_JSON` | MQTT bridge allowlist of device UUIDs to scoped tokens |
| `MQTT_HOST`, `MQTT_PORT`, `MQTT_TLS`, `MQTT_USERNAME`, `MQTT_PASSWORD` | Broker connection settings |

External chat additionally requires the user to enable **Allow external AI coaching** in Settings. Camera images are never included. No maps API key is needed: location stays in page memory, and sample gyms are clearly identified. Administrators can replace the catalog with verified listings.

## Deployment

The application targets a Worker and managed D1 for live deployment. `pnpm build` produces `dist/server/index.js`, static client assets and Worker configuration. The managed hosting workflow applies committed D1 migrations and publishes the matching source/build together. Access to the hosted demonstration is owner-private by default.

For a reproducible **local Docker demonstration**:

```bash
docker compose up --build
# Optional services:
docker compose --profile integration up --build
# Configure device token mapping before enabling the MQTT bridge:
docker compose --profile iot up --build
```

The Docker app uses Wrangler/Miniflare and is a local demonstration runtime, not a claim of a production database service. The broker and all ports bind to host loopback. Use managed Workers/D1 for production; deploy the Python/MQTT sidecar behind TLS with broker authentication and ACLs if physical hardware is introduced. [Deployment and operations](docs/DEPLOYMENT.md) covers roles, backups, secrets, migrations and rollback.

## Troubleshooting

- **No such table:** run `pnpm db:migrate` and use the same `.wrangler/state` directory as the app.
- **Port occupied:** set `PORT=4174` before `pnpm start`; the development command defaults to 5173.
- **Camera unavailable:** use HTTPS or localhost, grant permission, and close other apps using the camera. Check browser compatibility first. A cloud browser without a camera can use synthetic replay.
- **Model does not load:** confirm all `public/models` files are present; use a current Chrome/Edge browser with WebAssembly and workers enabled. No external model download occurs during a session.
- **Counting pauses:** show the working joints in a side view and begin fully extended (elbows bent for shoulder press). Visibility must exceed 0.65. Avoid backlighting and loose occluding clothing.
- **No matching recipe:** keep allergy restrictions. Ask an administrator to add a compatible, accurately labelled recipe. The planner never silently drops restrictions.
- **Forgotten password:** use the one-time recovery key. Email delivery/verification is not configured; the application does not pretend to send reset mail.
- **No external AI:** guided coaching remains available. A configured provider can still fail; the server falls back to guided mode.
- **MQTT readings rejected:** check device status/token, strictly increasing sequence numbers and topic allowlist. Rotate a compromised token in the app.
- **Frozen dependency install fails:** use the pinned pnpm version and preserve both `pnpm-lock.yaml` and `pnpm-workspace.yaml`.

## Honest limitations

Camera thresholds and form cues require empirical validation across people, camera positions and exercise variations; no measured accuracy is claimed. They do not verify every safety-critical aspect of a lift. Seed/replay tests establish deterministic behavior, not clinical efficacy. Guided chat and sentiment are rules; the external LLM is optional. Habit scores are explainable indexes, not trained probabilities. Nutrition data is curated estimation and cannot certify allergy safety. No physical equipment actuation occurs. Calendar apps manage exported reminders; FORM has no background push service. See the full evidence and remaining external verification limits in `docs/VERIFICATION.md`.
