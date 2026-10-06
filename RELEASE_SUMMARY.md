# FORM — Final Handoff

**Live app (private):** https://saksham-form-fitness.sakshamaveragecodes.chatgpt.site

**Release:** 1.0.0 · 28 September 2026. Source commit: `d4a1622d008224424235c8e1827f5e0865d5118a`.

**Status:** Production publication succeeded. Source, migration, dependency locks, model assets, tests, academic/technical documentation, CI and container configuration are packaged. The source specification was mapped against implementation in `docs/SOURCE_REQUIREMENTS.md`.

**Checks:** 72 TypeScript tests + 8 Python tests passed; 11 production-build HTTP checks passed. TypeScript, lint, production build, fresh/repeated migrations and production dependency audits passed. Browser demo, nutrition, schedule, buddy, replay, equipment, analytics, settings, admin/audit and responsive layouts were inspected. The final browser review found no application-origin console errors.

**Demo access:** Choose **Explore the demo** or **Explore admin sandbox**. There are no shared passwords. Create a personal account for persistent personal credentials and save its recovery key.

## Start locally on Windows

Install Node.js 24 or later. Extract the ZIP and open PowerShell in its `FORM_AI_Gym_Fitness_Assistant` folder:

```powershell
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
Copy-Item .env.example .dev.vars
pnpm setup:local
pnpm start
```

Open http://localhost:4173. Stop with Ctrl+C; later starts need only `pnpm start`. macOS/Linux: replace Copy-Item with `cp`. Preserve `.wrangler/state` to keep local data.

## Systems included

Seven modules: local MediaPipe trainer; nutrition/macros/meals/groceries/diary; smart equipment and MQTT architecture; habits/adherence/scheduling; contextual gym buddy; performance analytics; workout/challenge/gym recommendations. Accounts, onboarding, privacy settings, export/delete and tenant-scoped administration connect them.

The main app uses React/TypeScript, Workers and relational D1. `backend/` is the optional FastAPI integration service; `ai/` contains Python formula references; `iot/` contains bridge/simulator tools. `lib/` hosts production API and algorithms; `db/`/`drizzle/` hold schema/migrations; `docs/` contains academic report, diagrams and evidence.

## AI and external limits

The MediaPipe neural model is bundled; rep/form logic, performance, nutrition, habit risk and recommendation rules are implemented and explainable. Synthetic replay is labelled and excluded from real activity. Guided buddy works without a key; optional external LLM calls require server-side configuration and user consent.

The remote browser lacks WebGL 2, so **live physical webcam inference is not claimed as verified**. Replay/counting and friendly compatibility fallback were tested. Physical sensors, a live MQTT broker, optional external LLM and Docker runtime were not exercised. These require suitable local hardware/services; no model accuracy is fabricated.

Read `START_HERE.md` first, then `README.md` and `docs/VERIFICATION.md`. No paid API key is required for the default demonstration.
