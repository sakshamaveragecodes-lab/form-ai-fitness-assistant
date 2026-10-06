"""Check a running local build and real HTTP simulator. No credentials are printed."""
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import httpx
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from backend.app.config import form_base_url
base = form_base_url()
headers = {'X-Form-Action': '1', 'Origin': base}
clients, checks = [], []
def check(name, condition):
    assert condition, name
    checks.append(name)
    print('PASS: ' + name, flush=True)
def require_success(response):
    if response.is_error:
        # Infrastructure failures often use a plain-text response instead of the
        # application's JSON errors. Include that diagnostic, never success data.
        raise RuntimeError(f'{response.request.url.path}: HTTP {response.status_code}: {response.text[:1200]}')
    return response
try:
    with httpx.Client(base_url=base, timeout=20, trust_env=False) as anonymous:
        check('database-connected health endpoint', anonymous.get('/api/health').json()['database'] == 'connected')
        check('anonymous access denied', anonymous.get('/api/snapshot').status_code == 401)
        check('CSRF action header enforced', anonymous.post('/api/auth/demo', json={}).status_code == 403)
    for is_admin in [False, True]:
        client = httpx.Client(base_url=base, headers=headers, timeout=20, trust_env=False)
        response = client.post('/api/auth/demo', json={'admin': is_admin})
        require_success(response)
        clients.append(client)
        check('demo admin creation' if is_admin else 'demo user creation', response.json()['user']['role'] == ('admin' if is_admin else 'user'))
    user, admin = clients
    check('user cannot access admin API', user.get('/api/admin/overview').status_code == 403)
    check('admin can access admin API', admin.get('/api/admin/overview').status_code == 200)
    response = user.post('/api/devices', json={'name': 'HTTP verification device', 'exercise': 'curl', 'mode': 'hardware'})
    require_success(response)
    device = response.json()
    with tempfile.TemporaryDirectory(prefix='form-verification-') as temporary:
        env = {**os.environ, 'FORM_BASE_URL': base, 'FORM_DEVICE_ID': device['id'], 'FORM_DEVICE_TOKEN': device['deviceToken'], 'NO_PROXY': '127.0.0.1,localhost'}
        result = subprocess.run([sys.executable, '-m', 'iot.simulator', '--count', '2', '--interval', '1', '--state', str(Path(temporary)/'sequence.json')], cwd=ROOT, env=env, capture_output=True, text=True, timeout=35)
        if result.returncode:
            raise RuntimeError(result.stderr.replace(device['deviceToken'], '[redacted]')[-1500:])
        check('real HTTP simulator process exits successfully', result.returncode == 0)
    snapshot = user.get('/api/snapshot').json()
    stored = next(d for d in snapshot['devices'] if d['id'] == device['id'])['readings']
    check('two simulator readings persist with honest source labels', len(stored) == 2 and all(r['source'] == 'simulated' for r in stored))
    check('cross-workspace deletion denied', admin.delete('/api/devices/'+device['id']).status_code == 404)
    check('tenant snapshots isolated', all(d['id'] != device['id'] for d in admin.get('/api/snapshot').json()['devices']))
finally:
    for client in clients:
        response = client.request('DELETE', '/api/account', json={'confirmation': 'DELETE'})
        if response.status_code != 200:
            raise RuntimeError('Verification workspace cleanup failed')
        client.close()
print(f'{len(checks)} HTTP checks passed; verification workspaces removed.')
