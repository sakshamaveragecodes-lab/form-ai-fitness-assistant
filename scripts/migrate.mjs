import "./sites-env.mjs";
import { spawnSync } from "node:child_process";
const state = process.env.FORM_STATE_DIR || ".wrangler/state";
const result = spawnSync(
  process.execPath,
  [
    "node_modules/wrangler/bin/wrangler.js",
    "d1",
    "migrations",
    "apply",
    "DB",
    "--local",
    "--config",
    "wrangler.local.json",
    "--persist-to",
    state,
  ],
  { stdio: "inherit", env: { ...process.env, CI: "true" } },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
