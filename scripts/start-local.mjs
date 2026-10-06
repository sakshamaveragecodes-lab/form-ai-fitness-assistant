import "./sites-env.mjs";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
if (!existsSync("dist/server/index.js"))
  throw new Error("Run pnpm build first.");
// Docker environment is bridged into Wrangler's local secret file, never browser code.
const names = ["DEMO_MODE", "LLM_API_KEY", "LLM_BASE_URL", "LLM_MODEL"];
if (!existsSync(".dev.vars") && names.some((k) => process.env[k]))
  writeFileSync(
    ".dev.vars",
    names
      .filter((k) => process.env[k])
      .map((k) => `${k}=${JSON.stringify(process.env[k])}`)
      .join("\n") + "\n",
    { mode: 0o600 },
  );
const migration = spawnSync(process.execPath, ["scripts/migrate.mjs"], {
  stdio: "inherit",
});
if (migration.status !== 0) process.exit(migration.status ?? 1);
const args = [
  "node_modules/wrangler/bin/wrangler.js",
  "dev",
  "--config",
  "wrangler.local.json",
  "--local",
  "--persist-to",
  process.env.FORM_STATE_DIR || ".wrangler/state",
  "--ip",
  process.env.FORM_BIND_ADDRESS || "127.0.0.1",
  "--port",
  process.env.PORT || "4173",
  "--inspector-port",
  "0",
];
const child = spawn(process.execPath, args, { stdio: "inherit" });
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 0));
