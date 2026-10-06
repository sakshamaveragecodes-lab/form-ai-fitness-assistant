"""Verify a built app with isolated local state and actionable failure output."""
import os
from pathlib import Path
import signal
import subprocess
import sys
import time

import httpx


def stop_server(server):
    """An early-exiting server must not mask the original startup error."""
    try:
        os.killpg(server.pid, signal.SIGTERM)
    except ProcessLookupError:
        pass
    try:
        server.wait(timeout=5)
    except subprocess.TimeoutExpired:
        try:
            os.killpg(server.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        server.wait()


def main():
    root = Path(__file__).resolve().parents[1]
    evidence = root / "docs" / "evidence"
    evidence.mkdir(parents=True, exist_ok=True)
    logfile = evidence / "production-server.txt"
    config = root / ".sites-runtime" / "verification-config"
    config.mkdir(parents=True, exist_ok=True)
    env = {
        **os.environ,
        "PORT": "4183",
        "FORM_STATE_DIR": ".wrangler/http-verification",
        "FORM_BASE_URL": "http://127.0.0.1:4183",
        "XDG_CONFIG_HOME": str(config),
    }
    try:
        with logfile.open("w") as log:
            server = subprocess.Popen(
                ["node", "scripts/start-local.mjs"],
                cwd=root,
                env=env,
                stdout=log,
                stderr=subprocess.STDOUT,
                start_new_session=True,
            )
            try:
                ready = False
                with httpx.Client(trust_env=False, timeout=2) as client:
                    for _ in range(180):
                        status = server.poll()
                        if status is not None:
                            raise RuntimeError(f"Production server exited with code {status}.")
                        try:
                            ready = client.get(env["FORM_BASE_URL"] + "/api/health").status_code == 200
                            if ready:
                                break
                        except httpx.HTTPError:
                            pass
                        time.sleep(.25)
                if not ready:
                    raise RuntimeError("Production server did not become healthy.")
                smoke = subprocess.run(
                    [sys.executable, "scripts/smoke-http.py"],
                    cwd=root,
                    env=env,
                    capture_output=True,
                    text=True,
                    timeout=60,
                )
                print(smoke.stdout, end="", flush=True)
                if smoke.returncode:
                    raise RuntimeError(f"HTTP smoke check failed ({smoke.returncode}).\n{smoke.stderr}")
            finally:
                stop_server(server)
    except (OSError, RuntimeError, subprocess.TimeoutExpired) as error:
        tail = logfile.read_text(errors="replace")[-4000:] if logfile.exists() else ""
        message = f"{error}\nProduction server log: {logfile}\n{tail}"
        print(message, file=sys.stderr, flush=True)
        if os.getenv("GITHUB_ACTIONS") == "true":
            annotation = message.replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")
            print(f"::error title=Production smoke verification::{annotation}", flush=True)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
