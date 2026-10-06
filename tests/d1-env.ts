/** Execute real SQLite migrations and SQL, adapting only the Cloudflare binding. */
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
let sqlite: DatabaseSync;
class Prepared {
  constructor(
    readonly sql: string,
    readonly values: unknown[] = [],
  ) {}
  bind(...values: unknown[]) {
    return new Prepared(this.sql, values);
  }
  async all() {
    return {
      success: true,
      results: sqlite.prepare(this.sql).all(...(this.values as never[])),
    };
  }
  async first(column?: string) {
    const row = sqlite.prepare(this.sql).get(...(this.values as never[])) as
      | Record<string, unknown>
      | undefined;
    return column ? (row?.[column] ?? null) : (row ?? null);
  }
  async run() {
    const r = sqlite.prepare(this.sql).run(...(this.values as never[]));
    return {
      success: true,
      meta: {
        changes: Number(r.changes),
        last_row_id: Number(r.lastInsertRowid),
      },
    };
  }
}
const DB = {
  prepare: (sql: string) => new Prepared(sql),
  async batch(statements: Prepared[]) {
    sqlite.exec("BEGIN");
    try {
      const values = [];
      for (const s of statements) values.push(await s.run());
      sqlite.exec("COMMIT");
      return values;
    } catch (e) {
      sqlite.exec("ROLLBACK");
      throw e;
    }
  },
};
export const env: Record<string, unknown> = { DB, DEMO_MODE: "true" };
export function resetDatabase() {
  sqlite?.close();
  sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys=ON");
  const root = fileURLToPath(new URL("../drizzle/", import.meta.url));
  for (const f of readdirSync(root)
    .filter((x) => x.endsWith(".sql"))
    .sort())
    sqlite.exec(readFileSync(root + f, "utf8"));
  env.DEMO_MODE = "true";
  delete env.LLM_API_KEY;
}
export const query = (sql: string, ...values: unknown[]) =>
  sqlite.prepare(sql).all(...(values as never[])) as Record<string, any>[];
export const execute = (sql: string, ...values: unknown[]) =>
  sqlite.prepare(sql).run(...(values as never[]));
