"""Verify a built app with isolated local state and actionable failure output."""
import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import tempfile
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
    # Keep verification writes separate from application source/asset watchers.
    runtime = Path(tempfile.mkdtemp(prefix="form-built-verification-"))
    logfile = runtime / "production-server.txt"
    config = runtime / "config"
    config.mkdir(parents=True, exist_ok=True)
    env = {
        **os.environ,
        "PORT": "4183",
        "FORM_STATE_DIR": str(runtime / "state"),
        "FORM_BASE_URL": "http://127.0.0.1:4183",
        "XDG_CONFIG_HOME": str(config),
        "SITES_RUNTIME_ROOT": str(runtime / "tools"),
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
                healthy_since = None
                deadline = time.monotonic() + 45
                with httpx.Client(trust_env=False, timeout=2) as client:
                    while time.monotonic() < deadline:
                        status = server.poll()
                        if status is not None:
                            raise RuntimeError(f"Production server exited with code {status}.")
                        try:
                            healthy = client.get(env["FORM_BASE_URL"] + "/api/health").status_code == 200
                            if healthy:
                                healthy_since = healthy_since or time.monotonic()
                            else:
                                healthy_since = None
                            # Wrangler can finish startup with a Worker reload
                            # after the first health response. GETs are safe to
                            # probe; never retry the non-idempotent smoke POSTs.
                            if healthy_since is not None and time.monotonic() - healthy_since >= 2:
                                ready = True
                                break
                        except httpx.HTTPError:
                            healthy_since = None
                        time.sleep(.25)
                if not ready:
                    raise RuntimeError("Production server did not become stably healthy.")
                print("Production server passed the stable startup health check.", flush=True)
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
        output = logfile.read_text(errors="replace") if logfile.exists() else ""
        # Wrangler's module table can bury the useful error and exceed GitHub's
        # annotation length limit. The artifact still retains the complete log.
        lines = [line for line in output.splitlines() if not line.lstrip().startswith(("│", "├", "└", "┌", "─"))]
        tail = "\n".join(lines[-15:])[-1200:]
        message = f"{error}\nProduction server log: {logfile}\n{tail}"
        print(message, file=sys.stderr, flush=True)
        if os.getenv("GITHUB_ACTIONS") == "true":
            annotation = message.replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")
            print(f"::error title=Production smoke verification::{annotation}", flush=True)
        return 1
    finally:
        # Retain CI diagnostics only after the development server has stopped.
        if logfile.exists():
            shutil.copyfile(logfile, evidence / "production-server.txt")
        shutil.rmtree(runtime)
    return 0


if __name__ == "__main__":
    sys.exit(main())
