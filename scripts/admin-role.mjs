/** Privileged local operator utility. Public registration never grants admin. */
import "./sites-env.mjs";
import { spawnSync } from "node:child_process";
const [id, role = "admin"] = process.argv.slice(2);
if (!/^[a-f0-9-]{36}$/.test(id ?? "") || !["admin", "user"].includes(role))
  throw new Error(
    "Usage: node scripts/admin-role.mjs <verified-local-user-uuid> [admin|user]",
  );
const sql = `UPDATE users SET role='${role}' WHERE id='${id}' AND demo=0; DELETE FROM sessions WHERE user_id='${id}'; INSERT INTO audit (id,workspace_id,actor_id,action,entity,created_at) SELECT '${crypto.randomUUID()}',workspace_id,id,'Operator role changed','${role}',strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM users WHERE id='${id}' AND demo=0; SELECT id,name,role FROM users WHERE id='${id}' AND demo=0;`;
const result = spawnSync(
  process.execPath,
  [
    "node_modules/wrangler/bin/wrangler.js",
    "d1",
    "execute",
    "DB",
    "--local",
    "--config",
    "wrangler.local.json",
    "--persist-to",
    process.env.FORM_STATE_DIR || ".wrangler/state",
    "--command",
    sql,
  ],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);
