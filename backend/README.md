# Optional FastAPI integration service

The main deployed account/fitness backend is TypeScript/Workers with D1. This service provides real protected numerical endpoints and a telemetry gateway; it does not create a second user database.

```bash
python -m venv .venv
.venv/bin/pip install -r backend/requirements.lock
.venv/bin/python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

Set `AI_SERVICE_TOKEN` to a generated secret of at least 32 characters before calling numerical endpoints. Set `FORM_BASE_URL` to the trusted application origin for device forwarding. `/health` is public; `/docs` describes the API. Bearer authorization protects `/v1/nutrition/estimate` and `/v1/performance/score`; `/v1/telemetry` requires a scoped device token. Missing secrets fail closed. Run `python -m pytest backend/tests -q` for tests. Do not expose development configuration directly to the internet.
