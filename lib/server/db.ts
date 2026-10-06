import { env } from "cloudflare:workers";
export function db(): D1Database {
  const value = (env as unknown as { DB?: D1Database }).DB;
  if (!value) throw new Error("Database unavailable");
  return value;
}
export const runtime = () => env as unknown as Record<string, string>;
export const now = () => new Date().toISOString();
export const uid = () => crypto.randomUUID();
export async function all<T = any>(
  sql: string,
  ...values: unknown[]
): Promise<T[]> {
  const result = await db()
    .prepare(sql)
    .bind(...values)
    .all<T>();
  return result.results;
}
export async function one<T = any>(
  sql: string,
  ...values: unknown[]
): Promise<T | null> {
  return db()
    .prepare(sql)
    .bind(...values)
    .first<T>();
}
export async function run(sql: string, ...values: unknown[]) {
  return db()
    .prepare(sql)
    .bind(...values)
    .run();
}
export function statement(sql: string, ...values: unknown[]) {
  return db()
    .prepare(sql)
    .bind(...values);
}
export async function batch(statements: D1PreparedStatement[]) {
  if (statements.length) await db().batch(statements);
}
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function json(
  data: unknown,
  status = 200,
  extra: Record<string, string> = {},
) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...extra,
    },
  });
}
