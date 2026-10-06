"""Launch and verify a built app with an isolated database; stop the server on exit."""
import os
from pathlib import Path
import signal
import subprocess
import sys
import time
import httpx
root = Path(__file__).resolve().parents[1]
evidence = root/'docs'/'evidence'
evidence.mkdir(parents=True, exist_ok=True)
env = {**os.environ, 'PORT': '4183', 'FORM_STATE_DIR': '.wrangler/http-verification', 'FORM_BASE_URL': 'http://127.0.0.1:4183'}
with (evidence/'production-server.txt').open('w') as log:
    server = subprocess.Popen(['node', 'scripts/start-local.mjs'], cwd=root, env=env, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
    try:
        ready = False
        with httpx.Client(trust_env=False, timeout=2) as client:
            for _ in range(180):
                if server.poll() is not None:
                    raise RuntimeError('Production server exited; inspect production-server.txt')
                try:
                    ready = client.get(env['FORM_BASE_URL']+'/api/health').status_code == 200
                    if ready: break
                except httpx.HTTPError: pass
                time.sleep(.25)
        if not ready: raise RuntimeError('Production server did not become healthy')
        sys.exit(subprocess.run([sys.executable, 'scripts/smoke-http.py'], cwd=root, env=env, timeout=60).returncode)
    finally:
        os.killpg(server.pid, signal.SIGTERM)
        try: server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            os.killpg(server.pid, signal.SIGKILL)
            server.wait()
