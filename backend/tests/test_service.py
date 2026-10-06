import json
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from iot.bridge import parse_message
from iot.simulator import reading
from backend.app.config import form_base_url

client = TestClient(app)
TOKEN = 'test-only-service-token-with-32-characters'
HEADER = {'Authorization': 'Bearer ' + TOKEN}
PROFILE = {'age': 30, 'sex': 'male', 'height': 180, 'weight': 80}

@pytest.fixture(autouse=True)
def configuration(monkeypatch):
    monkeypatch.setenv('AI_SERVICE_TOKEN', TOKEN)


def test_health_and_access_control():
    assert client.get('/health').status_code == 200
    assert client.post('/v1/nutrition/estimate', json=PROFILE).status_code == 401
    assert client.post('/v1/nutrition/estimate', json=PROFILE, headers={'Authorization': 'Bearer wrong'}).status_code == 401


def test_estimate_matches_typescript_fixture():
    result = client.post('/v1/nutrition/estimate', json=PROFILE, headers=HEADER)
    assert result.status_code == 200
    assert result.json() == {'bmi': 24.7, 'bmr': 1780, 'bmrRange': None, 'tdee': 2759, 'calories': 2759, 'protein': 128, 'fat': 92, 'carbs': 355, 'blocked': False}


def test_sensitive_and_invalid_profiles():
    assert client.post('/v1/nutrition/estimate', json={**PROFILE, 'sensitive': True}, headers=HEADER).json()['calories'] is None
    assert client.post('/v1/nutrition/estimate', json={**PROFILE, 'weight': -20}, headers=HEADER).status_code == 422


def test_performance_matches_typescript_fixture():
    rep = {'duration': 4, 'range': 80, 'form': 90, 'tempo': 100}
    result = client.post('/v1/performance/score', json={'exercise': 'squat', 'target': 4, 'reps': [rep, rep]}, headers=HEADER)
    assert result.json() == {'score': 87, 'form': 90, 'rom': 80, 'tempo': 100, 'consistency': 100, 'completion': 50}


def test_device_gateway_requires_token():
    assert client.post('/v1/telemetry', json=reading(10)).status_code == 401


def test_mqtt_message_validation():
    device = '00000000-0000-4000-8000-000000000001'
    value = json.dumps(reading(10)).encode()
    assert parse_message(f'form/v1/devices/{device}/telemetry', value, {device: 'a'*64})[1]['sequence'] == 10
    with pytest.raises(ValueError):
        parse_message(f'form/v1/devices/{device}/telemetry', value, {})
    with pytest.raises(ValueError):
        parse_message(f'form/v1/devices/{device}/telemetry', b'x'*5000, {device: 'a'*64})


def test_public_upstream_requires_https(monkeypatch):
    monkeypatch.setenv('FORM_BASE_URL', 'http://public.example')
    with pytest.raises(ValueError):
        form_base_url()


def test_missing_service_secret_is_closed(monkeypatch):
    monkeypatch.delenv('AI_SERVICE_TOKEN')
    assert client.post('/v1/nutrition/estimate', json=PROFILE, headers=HEADER).status_code == 503
