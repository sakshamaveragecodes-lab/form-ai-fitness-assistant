import { beforeEach, describe, it, expect } from "vitest";
import { POST as handle } from "@/app/api/[...path]/route";
import { resetDatabase, query, execute, env } from "./d1-env";
import { DEFAULT_PROFILE } from "@/lib/types";
import { localDate } from "@/lib/algorithms/habits";
let serial = 0;
const password = "Test-only fitness passphrase 47!";
async function request(
  path: string,
  method = "GET",
  data?: unknown,
  cookie = "",
  headers: Record<string, string> = {},
) {
  const r = await handle(
    new Request("https://form.test/api/" + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Form-Action": "1",
        Origin: "https://form.test",
        "CF-Connecting-IP": "192.0.2.1",
        ...(cookie ? { Cookie: cookie } : {}),
        ...headers,
      },
      ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
    }),
  );
  return {
    status: r.status,
    body: (await r.json()) as any,
    headers: r.headers,
    cookie: r.headers.get("set-cookie")?.split(";")[0] ?? "",
  };
}
async function register() {
  return request("auth/register", "POST", {
    name: "Test Athlete",
    email: `athlete${++serial}@example.test`,
    password,
  });
}
async function demo(admin = false) {
  return request("auth/demo", "POST", { admin });
}
const manual = {
  title: "Squat session",
  exercise: "squat",
  reps: 12,
  sets: 1,
  duration: 60,
  resistance: 0,
  rpe: 6,
  source: "manual",
  metrics: [],
  target: 12,
  notes: "",
};
const food = {
  food_name: "Labelled oats",
  calories: 200,
  protein: 8,
  carbs: 30,
  fat: 6,
  meal: "Breakfast",
  quantity: 1,
  date: localDate(),
};
const telemetry = {
  sequence: 10,
  resistance: 10,
  reps: 10,
  duration: 40,
  rest: 90,
  heart_rate: 120,
  rpe: 6,
  form: 90,
};
beforeEach(resetDatabase);
describe("Migrations, accounts and sessions", () => {
  it("applies migrations with foreign keys and rejects orphan records", () => {
    expect(
      query("SELECT name FROM sqlite_master WHERE type='table'"),
    ).toHaveLength(18);
    expect(() =>
      execute("INSERT INTO sessions VALUES ('a','missing',9,'now')"),
    ).toThrow(/FOREIGN KEY/);
  });
  it("registers a user with salted password hashes and secure opaque sessions", async () => {
    const a = await register();
    expect(a.status).toBe(201);
    expect(a.body.user.role).toBe("user");
    expect(a.body).not.toHaveProperty("password_hash");
    expect(a.headers.get("set-cookie")).toMatch(
      /HttpOnly; SameSite=Lax; Max-Age=604800; Secure/,
    );
    expect(query("SELECT password_hash FROM users")[0].password_hash).toMatch(
      /^pbkdf2-sha256\$100000\$/,
    );
    expect(query("SELECT token_hash FROM sessions")[0].token_hash).not.toBe(
      a.cookie.split("=")[1],
    );
    expect((await request("auth/me", "GET", undefined, a.cookie)).status).toBe(
      200,
    );
  });
  it("does not accept administrator privileges in registration input", async () => {
    const r = await request("auth/register", "POST", {
      name: "Test User",
      email: "test@example.test",
      password,
      role: "admin",
    });
    expect(r.body.user.role).toBe("user");
    expect(
      (await request("admin/overview", "GET", undefined, r.cookie)).status,
    ).toBe(403);
  });
  it("rejects weak passwords, invalid JSON, oversized bodies and missing sessions", async () => {
    expect(
      (
        await request("auth/register", "POST", {
          name: "Test",
          email: "x@example.test",
          password: "weak",
        })
      ).status,
    ).toBe(422);
    expect(
      (
        await handle(
          new Request("https://form.test/api/auth/register", {
            method: "POST",
            headers: { "X-Form-Action": "1" },
            body: "{broken",
          }),
        )
      ).status,
    ).toBe(400);
    expect(
      (await request("auth/register", "POST", { name: "X".repeat(100001) }))
        .status,
    ).toBe(413);
    expect((await request("snapshot")).status).toBe(401);
  });
  it("authenticates valid credentials, rejects wrong credentials and duplicate emails", async () => {
    const a = await register();
    expect(
      (
        await request("auth/login", "POST", {
          email: a.body.user.email,
          password,
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await request("auth/login", "POST", {
          email: a.body.user.email,
          password: "incorrect",
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await request("auth/register", "POST", {
          name: "Other",
          email: a.body.user.email,
          password,
        })
      ).status,
    ).toBe(409);
  });
  it("blocks cross-origin and missing-CSRF-header writes", async () => {
    expect(
      (
        await request("auth/demo", "POST", {}, "", {
          Origin: "https://evil.test",
        })
      ).status,
    ).toBe(403);
    expect(
      (await request("auth/demo", "POST", {}, "", { "X-Form-Action": "" }))
        .status,
    ).toBe(403);
  });
  it("rotates sessions and revokes logout sessions", async () => {
    const a = await register();
    const next = await request("auth/refresh", "POST", {}, a.cookie);
    expect(next.status).toBe(200);
    expect(next.cookie).not.toBe(a.cookie);
    expect((await request("auth/me", "GET", undefined, a.cookie)).status).toBe(
      401,
    );
    expect((await request("auth/logout", "POST", {}, next.cookie)).status).toBe(
      200,
    );
    expect(
      (await request("auth/me", "GET", undefined, next.cookie)).status,
    ).toBe(401);
  });
  it("resets with a one-use recovery key and revokes all sessions", async () => {
    const a = await register();
    const payload = {
      email: a.body.user.email,
      recoveryKey: a.body.recoveryKey,
      password: "Replacement test password 84!",
    };
    expect(
      (
        await request("auth/reset", "POST", {
          ...payload,
          recoveryKey: "a".repeat(64),
        })
      ).status,
    ).toBe(400);
    const r = await request("auth/reset", "POST", payload);
    expect(r.status).toBe(200);
    expect(r.body.recoveryKey).not.toBe(payload.recoveryKey);
    expect((await request("auth/me", "GET", undefined, a.cookie)).status).toBe(
      401,
    );
    expect((await request("auth/reset", "POST", payload)).status).toBe(400);
    expect(
      (
        await request("auth/login", "POST", {
          email: payload.email,
          password: payload.password,
        })
      ).status,
    ).toBe(200);
  });
  it("requires the current password for password changes", async () => {
    const a = await register();
    expect(
      (
        await request(
          "auth/password",
          "POST",
          {
            currentPassword: "incorrect",
            password: "Another test password 64!",
          },
          a.cookie,
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await request(
          "auth/password",
          "POST",
          { currentPassword: password, password: "Another test password 64!" },
          a.cookie,
        )
      ).status,
    ).toBe(200);
    expect((await request("auth/me", "GET", undefined, a.cookie)).status).toBe(
      401,
    );
  });
  it("throttles credential attacks and permits disabling public demos", async () => {
    for (let i = 0; i < 10; i++)
      await request("auth/login", "POST", {
        email: "absent@example.test",
        password,
      });
    expect(
      (
        await request("auth/login", "POST", {
          email: "absent@example.test",
          password,
        })
      ).status,
    ).toBe(429);
    env.DEMO_MODE = "false";
    expect((await demo(true)).status).toBe(403);
  });
});
describe("Application workflows and ownership", () => {
  it("persists onboarding, rejects invalid profiles and retains plans for reminder-only changes", async () => {
    const a = await register();
    const p = { ...DEFAULT_PROFILE, onboarded: true };
    expect(
      (await request("profile", "PUT", { ...p, age: 9 }, a.cookie)).status,
    ).toBe(422);
    expect((await request("profile", "PUT", p, a.cookie)).status).toBe(200);
    const plan = await request(
      "nutrition/plan",
      "POST",
      { variation: 0 },
      a.cookie,
    );
    expect(plan.status).toBe(200);
    await request("profile", "PUT", { ...p, reminders: false }, a.cookie);
    let s = (await request("snapshot", "GET", undefined, a.cookie)).body;
    expect(s.profile.onboarded).toBe(true);
    expect(s.plan.id).toBe(plan.body.plan.id);
    expect(s.schedule.length).toBeGreaterThan(0);
    await request("profile", "PUT", { ...p, allergies: ["Milk"] }, a.cookie);
    s = (await request("snapshot", "GET", undefined, a.cookie)).body;
    expect(s.plan).toBeNull();
  });
  it("never exposes or deletes another user’s workouts, foods or devices", async () => {
    const a = await register(),
      b = await register();
    const w = await request("workouts", "POST", manual, a.cookie),
      f = await request("nutrition/logs", "POST", food, a.cookie),
      d = await request(
        "devices",
        "POST",
        { name: "Test sensor", exercise: "curl", mode: "hardware" },
        a.cookie,
      );
    expect(
      (await request("workouts/" + w.body.id, "DELETE", undefined, b.cookie))
        .status,
    ).toBe(404);
    expect(
      (
        await request(
          "nutrition/logs/" + f.body.id,
          "DELETE",
          undefined,
          b.cookie,
        )
      ).status,
    ).toBe(404);
    expect(
      (await request("devices/" + d.body.id + "/rotate", "POST", {}, b.cookie))
        .status,
    ).toBe(404);
    const snapshot = (await request("snapshot", "GET", undefined, b.cookie))
      .body;
    expect(snapshot.workouts).toHaveLength(0);
    expect(snapshot.logs).toHaveLength(0);
    expect(snapshot.devices.some((x: any) => x.id === d.body.id)).toBe(false);
  });
  it("computes camera scores on the server and refuses mismatched evidence", async () => {
    const a = await register();
    const rep = { duration: 4, range: 80, form: 90, tempo: 100 };
    const payload = {
      ...manual,
      source: "camera",
      reps: 2,
      metrics: [rep, rep],
      target: 4,
    };
    const r = await request("workouts", "POST", payload, a.cookie);
    expect(r.body.score).toBe(87);
    expect(
      (await request("workouts", "POST", { ...payload, reps: 3 }, a.cookie))
        .status,
    ).toBe(422);
    expect(
      (await request("workouts", "POST", { ...payload, score: 100 }, a.cookie))
        .status,
    ).toBe(422);
    expect(
      (
        await request(
          "workouts",
          "POST",
          { ...payload, reps: 0, metrics: [] },
          a.cookie,
        )
      ).status,
    ).toBe(400);
  });
  it("keeps replay sessions out of adherence and recalculates completion after deletion", async () => {
    const a = await register();
    await request(
      "schedule",
      "POST",
      { date: localDate(), time: "18:00", title: "Today session" },
      a.cookie,
    );
    await request(
      "workouts",
      "POST",
      { ...manual, source: "replay", reps: 0 },
      a.cookie,
    );
    expect(query("SELECT status FROM schedule")[0].status).toBe("scheduled");
    const w = await request("workouts", "POST", manual, a.cookie);
    expect(query("SELECT status FROM schedule")[0].status).toBe("completed");
    await request("workouts/" + w.body.id, "DELETE", undefined, a.cookie);
    expect(query("SELECT status FROM schedule")[0].status).toBe("scheduled");
  });
  it("logs food and grocery completion and rejects invalid calendar values", async () => {
    const a = await register();
    expect(
      (await request("nutrition/logs", "POST", food, a.cookie)).status,
    ).toBe(201);
    expect(
      (
        await request(
          "nutrition/logs",
          "POST",
          { ...food, date: "2026-02-30" },
          a.cookie,
        )
      ).status,
    ).toBe(422);
    await request("nutrition/plan", "POST", {}, a.cookie);
    await request("nutrition/grocery", "PUT", { checked: ["Oats"] }, a.cookie);
    const s = (await request("snapshot", "GET", undefined, a.cookie)).body;
    expect(s.logs[0].calories).toBe(200);
    expect(s.plan.checked).toEqual(["Oats"]);
  });
  it("stores chat context and routes dangerous medical requests to safety guidance", async () => {
    const a = await register();
    const r = await request(
      "chat",
      "POST",
      { message: "I have chest pain while exercising" },
      a.cookie,
    );
    expect(r.status).toBe(200);
    expect(JSON.stringify(r.body).toLowerCase()).toMatch(/emergency|urgent/);
    expect(query("SELECT * FROM messages")).toHaveLength(2);
  });
  it("exports personal data without credential material and cascades confirmed deletion", async () => {
    const a = await register(),
      b = await register();
    await request("workouts", "POST", manual, a.cookie);
    const out = await request("account/export", "GET", undefined, a.cookie);
    expect(out.status).toBe(200);
    expect(JSON.stringify(out.body)).not.toMatch(
      /password_hash|recovery_hash|token_hash/,
    );
    expect(
      (
        await request(
          "account",
          "DELETE",
          { confirmation: "DELETE", password: "wrong" },
          a.cookie,
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await request(
          "account",
          "DELETE",
          { confirmation: "DELETE", password },
          a.cookie,
        )
      ).status,
    ).toBe(200);
    expect(query("SELECT * FROM workouts")).toHaveLength(0);
    expect((await request("auth/me", "GET", undefined, b.cookie)).status).toBe(
      200,
    );
    expect(query("PRAGMA foreign_key_check")).toEqual([]);
  });
});
describe("Admin separation and device credentials", () => {
  it("provides isolated demo tenants and enforces workspace-bound administration", async () => {
    const a = await demo(true),
      b = await demo(true),
      ordinary = await register();
    expect(a.body.user.workspace_id).not.toBe(b.body.user.workspace_id);
    expect(
      (await request("admin/overview", "GET", undefined, ordinary.cookie))
        .status,
    ).toBe(403);
    expect(
      (
        await request(
          "admin/users/" + b.body.user.id,
          "PATCH",
          { status: "suspended" },
          a.cookie,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await request(
          "admin/users/" + a.body.user.id,
          "PATCH",
          { status: "suspended" },
          a.cookie,
        )
      ).status,
    ).toBe(400);
    const target = query(
      "SELECT id FROM users WHERE workspace_id=? AND id!=?",
      a.body.user.workspace_id,
      a.body.user.id,
    )[0];
    expect(
      (
        await request(
          "admin/users/" + target.id,
          "PATCH",
          { status: "suspended" },
          a.cookie,
        )
      ).status,
    ).toBe(200);
    expect(query("SELECT * FROM audit")).toHaveLength(1);
    const users = await request(
      "admin/users?q=notpresent",
      "GET",
      undefined,
      a.cookie,
    );
    expect(users.body.items).toEqual([]);
  });
  it("validates content edits and cannot archive content from another tenant", async () => {
    const a = await demo(true),
      b = await demo(true);
    const foreign = query(
      "SELECT id FROM catalog WHERE workspace_id=?",
      b.body.user.workspace_id,
    )[0];
    expect(
      (
        await request(
          "admin/catalog/" + foreign.id,
          "DELETE",
          undefined,
          a.cookie,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await request(
          "admin/catalog",
          "POST",
          {
            kind: "meals",
            name: "Bad recipe",
            description: "",
            data: {},
            active: 1,
          },
          a.cookie,
        )
      ).status,
    ).toBe(422);
    const made = await request(
      "admin/catalog",
      "POST",
      {
        kind: "content",
        name: "Recovery guide",
        description: "Rest supports training.",
        data: { category: "recovery" },
        active: 1,
      },
      a.cookie,
    );
    expect(made.status).toBe(200);
    expect(
      (
        await request(
          "admin/catalog/" + made.body.id,
          "DELETE",
          undefined,
          a.cookie,
        )
      ).status,
    ).toBe(200);
    expect(
      query("SELECT active FROM catalog WHERE id=?", made.body.id)[0].active,
    ).toBe(0);
  });
  it("accepts authenticated telemetry, deduplicates and rejects revoked tokens", async () => {
    const a = await register();
    const d = await request(
      "devices",
      "POST",
      { name: "Test sensor", exercise: "curl", mode: "hardware" },
      a.cookie,
    );
    const headers = { Authorization: "Device " + d.body.deviceToken };
    expect((await request("iot/ingest", "POST", telemetry)).status).toBe(401);
    expect(
      (await request("iot/ingest", "POST", telemetry, "", headers)).status,
    ).toBe(201);
    expect(
      (await request("iot/ingest", "POST", telemetry, "", headers)).body
        .duplicate,
    ).toBe(true);
    expect(
      (
        await request(
          "iot/ingest",
          "POST",
          { ...telemetry, sequence: 9 },
          "",
          headers,
        )
      ).status,
    ).toBe(409);
    const rotated = await request(
      "devices/" + d.body.id + "/rotate",
      "POST",
      {},
      a.cookie,
    );
    expect(rotated.body.deviceToken).not.toBe(d.body.deviceToken);
    expect(
      (
        await request(
          "iot/ingest",
          "POST",
          { ...telemetry, sequence: 11 },
          "",
          headers,
        )
      ).status,
    ).toBe(401);
    await request("devices/" + d.body.id, "PATCH", { active: false }, a.cookie);
    expect(
      (
        await request(
          "iot/ingest",
          "POST",
          { ...telemetry, sequence: 11 },
          "",
          { Authorization: "Device " + rotated.body.deviceToken },
        )
      ).status,
    ).toBe(401);
  });
  it("generates explicitly simulated data without creating workouts", async () => {
    const a = await register();
    const s = (await request("snapshot", "GET", undefined, a.cookie)).body;
    const r = await request(
      "devices/" + s.devices[0].id + "/simulate",
      "POST",
      {},
      a.cookie,
    );
    expect(r.body.reading.source).toBe("simulated");
    expect(query("SELECT * FROM workouts")).toHaveLength(0);
  });
});
