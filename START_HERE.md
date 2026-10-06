# FORM — final handoff

**Project:** AI Gym & Fitness Assistant. All seven modules, account flows, administration, local camera integration, demo data and deployment files are included. Read `docs/VERIFICATION.md` for measured results and external limits.

## Start on Windows

Install Node.js 24 or newer. Extract the ZIP, open PowerShell in `FORM_AI_Gym_Fitness_Assistant`, and run:

```powershell
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
Copy-Item .env.example .dev.vars
pnpm setup:local
pnpm start
```

Open **http://localhost:4173**. Leave the terminal running. Stop with Ctrl+C. Subsequent launches need only `pnpm start`. Keep `.wrangler/state` to preserve your local records. On macOS/Linux use `cp .env.example .dev.vars` in place of Copy-Item.

## Demonstrate the project

1. Choose **Explore the demo** for populated user data. No demo password is needed.
2. Open Nutrition, generate a plan, inspect groceries and log a food.
3. Open Habits & schedule; add a manageable session.
4. Ask Gym buddy for a plan; the default guided mode needs no external key.
5. Open Live trainer; use the labelled Motion replay, or enable a webcam on a graphics-enabled browser. Save the session.
6. Review My progress and Smart equipment; start/stop the labelled simulation.
7. Exit the demo and choose **Explore admin sandbox** for tenant-isolated administration.

Create a personal account for your own login and save its one-time recovery key. Demo sessions have undisclosed generated passwords; there is no shared administrator credential.

## What is delivered

- `app/`, `components/`, `lib/`: React UI, Worker APIs and production algorithms.
- `db/`, `drizzle/`: schema and executable migrations.
- `public/models/`: bundled MediaPipe assets and asset checksum evidence.
- `backend/`, `ai/`, `iot/`: optional FastAPI service, formula reference, MQTT bridge and simulator.
- `tests/`, `backend/tests/`: runnable tests; `docs/evidence/`: executed results.
- `docs/`: architecture/ER diagrams, algorithm cards, API/security/deployment guides, source traceability and academic report.
- Dockerfiles, Compose, CI, `.env.example`, pinned lockfiles and repeatable setup/packaging scripts.

The main hosted backend is TypeScript/Workers with D1. Python is a real optional integration service; PostgreSQL/Python are not falsely claimed as the deployed main backend.

## Checks and limitations

80 automated tests and 11 running-build HTTP checks passed. Migrations, TypeScript, lint, production build and dependency audits passed. Browser journeys were inspected. Live physical webcam validation remains limited by the remote browser's lack of WebGL 2; real equipment, an MQTT broker and optional external LLM were not available. See the verification record for exact scope.

An LLM key is optional and stays server-side. External chat additionally requires user consent in Settings. Camera video is processed locally. The included gyms and equipment simulation are explicitly demo data. No ML accuracy is fabricated.

## Optional Python tools

```powershell
python -m venv .venv
.venv\Scripts\python -m pip install -r backend/requirements.lock
.venv\Scripts\python -m pytest backend/tests -q
```

See README.md for FastAPI, MQTT, tests and configuration. Normal app use does not need Python, Docker or a paid service.
