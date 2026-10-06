# Source import and cloud validation

Imported the application-root contents from the supplied project archive; outer delivery folders and ZIP/bundle files were not included. Application source, tests, project assets, documentation, sample data, model assets (when supplied), and dependency/configuration files were preserved. Ignore rules protect local secrets and generated development artifacts. Shell launchers are executable.

The existing verification documents and package manifests describe the supplied archive's historical run. The results below describe the cloud import validation on 2026-10-06.

Before publication, Gitleaks 8.24.2 scanned the publishable files and extracted text from PDF/DOCX deliverables with no credential findings. Blank `.env.example` templates are included; populated environment files and runtime credentials are excluded.

## Reproduce

Use Node.js 24 and pnpm 11.25.0, plus Python 3.12 for the optional backend tests and HTTP smoke runner.

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm lint
pnpm build
python3.12 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.lock
.venv/bin/python -m pytest backend/tests -q
.venv/bin/python scripts/verify-built.py
pnpm start
```

In a cloud sandbox with a read-only home configuration directory, first run:

```sh
mkdir -p .sites-runtime/xdg-config
export XDG_CONFIG_HOME="$PWD/.sites-runtime/xdg-config"
```

The frozen dependency install, typecheck, lint and production build passed. All 72 TypeScript tests and eight Python tests passed. The built app passed all 11 HTTP checks, including D1 migrations, auth/CSRF, admin access, tenant isolation and the HTTP device simulator. No paid API is required for guided/demo mode. Physical camera/equipment, MQTT broker, optional external LLM and Docker execution were not tested. Supplied MediaPipe assets and third-party license files are preserved.
