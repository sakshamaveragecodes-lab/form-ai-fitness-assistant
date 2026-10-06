"""Stateless, authenticated scientific/API integration surface for FORM."""
import hmac
import os
import re
import httpx
from fastapi import FastAPI, Depends, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from ai.calculations import nutrition, performance
from .config import form_base_url
from .schemas import NutritionInput, PerformanceInput, Telemetry

app = FastAPI(title='FORM Integration API', version='1.0.0', description='Numerical reference and device gateway. Main account/fitness API is /api on the FORM application.')
bearer = HTTPBearer(auto_error=False)


async def service_access(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)):
    expected = os.getenv('AI_SERVICE_TOKEN', '')
    if len(expected) < 32:
        raise HTTPException(503, 'Configure a service token of at least 32 characters.')
    if not credentials or not hmac.compare_digest(credentials.credentials, expected):
        raise HTTPException(401, 'A valid service token is required.', headers={'WWW-Authenticate': 'Bearer'})


@app.middleware('http')
async def headers_and_limits(request: Request, call_next):
    if request.method in {'POST', 'PUT', 'PATCH'} and len(await request.body()) > 100000:
        return JSONResponse({'detail': 'Request is too large.'}, status_code=413)
    response = await call_next(request)
    response.headers['Cache-Control'] = 'no-store'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    return response


@app.get('/health')
def health():
    return {'status': 'ok', 'service': 'form-integration', 'state': 'stateless'}


@app.post('/v1/nutrition/estimate', dependencies=[Depends(service_access)])
def estimate(payload: NutritionInput):
    return nutrition(payload.model_dump())


@app.post('/v1/performance/score', dependencies=[Depends(service_access)])
def score(payload: PerformanceInput):
    return performance([r.model_dump() for r in payload.reps], payload.target, payload.exercise)


@app.post('/v1/telemetry')
async def telemetry(payload: Telemetry, authorization: str = Header(default='')):
    # The application remains the authority for ownership, revocation and rate limits.
    if not re.fullmatch(r'Device [a-f0-9]{64}', authorization):
        raise HTTPException(401, 'Use the token issued by your FORM equipment page.')
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=False) as client:
            result = await client.post(form_base_url() + '/api/iot/ingest', json=payload.model_dump(), headers={'Authorization': authorization})
        if result.status_code >= 500:
            raise HTTPException(502, 'The fitness application is temporarily unavailable.')
        return JSONResponse(result.json(), status_code=result.status_code)
    except (httpx.HTTPError, ValueError):
        raise HTTPException(502, 'The fitness application could not be reached.') from None
