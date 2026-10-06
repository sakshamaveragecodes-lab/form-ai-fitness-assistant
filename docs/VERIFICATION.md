# Final verification record

Verified 28 September 2026. This record separates executable checks, browser observations and external limitations. No model accuracy or hardware validation is inferred from unit tests.

| Gate                                   | Executed result                                                                                                                         | Evidence                                             |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Dependency installation                | Frozen JavaScript lock accepted; pinned Python lock installed                                                                           | evidence/frozen-install.txt, python-install.txt      |
| TypeScript                             | `tsc --noEmit` passed                                                                                                                   | evidence/typecheck.txt                               |
| Lint                                   | ESLint passed for application/server/algorithm/test code                                                                                | evidence/lint.txt                                    |
| Calculations                           | 33 tests passed: nutrition, restrictions, performance, habits, angle/rep logic                                                          | evidence/typescript-tests.txt                        |
| Recommendation and buddy rules         | 12 tests passed                                                                                                                         | evidence/typescript-tests.txt                        |
| Actual API handlers / SQLite           | 21 tests passed: registration/login, hashing, sessions/recovery, CSRF, role and ownership boundaries, persistence/export/delete         | evidence/typescript-tests.txt                        |
| Frontend components                    | 6 tests passed: accessible forms, onboarding, failed inputs and actual manual-log fields                                                | evidence/typescript-tests.txt                        |
| Python integration                     | 8 tests passed: formula parity, sensitive cases, access tokens, MQTT validation, safe upstream                                          | evidence/python-tests.txt                            |
| Production build                       | Vinext Worker/client build succeeded                                                                                                    | evidence/production-build.txt                        |
| Running built application              | 11 HTTP checks passed, including anonymous/admin/tenant boundaries and two real simulator-process readings stored with simulated labels | evidence/http-smoke.txt                              |
| Database migrations                    | Initial migration: 35 commands; repeat: no migrations to apply                                                                          | evidence/migrations-first.txt, migrations-repeat.txt |
| JavaScript production dependency audit | No known vulnerabilities reported                                                                                                       | evidence/dependency-audit.json                       |
| Python pinned dependency audit         | No known vulnerabilities reported                                                                                                       | evidence/python-dependency-audit.json                |
| Container/CI configuration             | YAML parsed; Docker runtime not exercised because no daemon is available                                                                | docker-compose.yml, .github/workflows/verify.yml     |

Total: **80 automated unit/component/API tests plus 11 running-build HTTP checks passed**. Audit results reflect the available advisory databases at verification time, not a guarantee of no vulnerabilities. FastAPI's test client emits two upstream deprecation warnings (httpx transition and AnyIO alias); the test suite succeeds. Vinext prints a non-failing static route-classification note.

## Browser observations

The managed Chromium preview was used for actual interactions, not only screenshots:

- Landing page, isolated demo authentication, populated dashboard and stored-data read-back.
- Exercise library and trainer selection; synthetic squat replay reached 2/2 reps, 1/1 sets, then saved with its replay source label. Real activity analytics excluded replay.
- Nutrition plan and grocery tabs; food logging updated persisted energy/protein totals.
- Schedule save and dashboard read-back; explainable habit values and calendar rendered.
- Buddy accepted a meal-planning question and used saved calorie/protein targets in guided mode.
- Performance charts and exact-value tables rendered from stored sample sessions.
- Smart equipment produced four persisted synthetic readings and corresponding rest/load guidance.
- Display-name change persisted and appeared in navigation.
- Recommendations and challenge progress rendered with explicit scoring explanations and demo labels.
- Administrator dashboard, member search, status confirmation and audit controls were exercised in an isolated demo workspace. A sample member was suspended and the audit entry was read back.
- A 390-pixel embedded mobile viewport rendered dashboard and nutrition without document overflow (375 CSS pixels plus scrollbar). The mobile sidebar opened and navigated successfully. This is responsive viewport verification, not a physical-device test.

The final browser console review found no application-origin errors; extension metadata messages were excluded.

Browser password registration/login was not performed by entering credentials in the remote browser. Those flows were executed in API and component tests; browser demo entry/exit was exercised. Browser observations made during earlier verification sessions remain applicable to unchanged components; executable gates were rerun for the release source.

## Important limits

The browser's local pose compatibility check identified missing WebGL 2. The classic-worker importScripts defect was fixed, and unsupported graphics/camera conditions present a friendly fallback. **A live webcam inference pass is not claimed.** Geometry and replay tests cannot establish the upstream model's real-world accuracy. Use HTTPS/localhost with a camera and graphics-enabled browser for physical validation.

No external LLM key, physical gym equipment, live MQTT broker or verified maps/places provider was configured. Guided coaching and labelled simulations work without them. Container execution requires Docker. Optional WebMCP registration was present in source, but the permitted browser exposed no registered tool; tool-call validation was unavailable and is not claimed.

The source document was reviewed against docs/SOURCE_REQUIREMENTS.md. The hosted backend is TypeScript/Workers with relational D1; the included FastAPI service is optional. This deliberate deployment adaptation is documented throughout the handoff.

## Reproduce

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm db:migrate
pnpm db:migrate
pnpm audit --prod
python -m venv .venv
.venv/bin/pip install -r backend/requirements.lock
.venv/bin/python -m pytest backend/tests -q
.venv/bin/python scripts/verify-built.py
```

The production HTTP helper uses a separate local database, creates test-only workspaces and removes them before exiting. The release package excludes state databases, virtual environments, installed dependencies and credentials; it includes source, locks, models, migrations, documentation, deployment configuration and evidence.
