import { z } from "zod";
import { localDate, shiftDate } from "../../algorithms/habits";
import { makeMealPlan } from "../../algorithms/nutrition";
import { performanceScore } from "../../algorithms/performance";
import { plankScore } from "../../algorithms/pose";
import { recommendPlans } from "../../algorithms/recommendations";
import type { CatalogItem, User } from "../../types";
import {
  all,
  ApiError,
  batch,
  json,
  now,
  one,
  run,
  statement,
  uid,
} from "../db";
import { cookie, rateLimit, verifyPassword } from "../security";
import { ensureSchedule, getProfile, snapshot } from "../snapshot";
import {
  body,
  dateSchema,
  foodSchema,
  profileSchema,
  timeSchema,
  workoutSchema,
} from "../validation";
export async function fitnessRoute(
  req: Request,
  path: string,
  u: User,
): Promise<Response | null> {
  if (path === "snapshot" && req.method === "GET")
    return json(await snapshot(u));
  if (path === "profile" && req.method === "PUT") {
    const p = await body(req, profileSchema),
      previous = await getProfile(u.id);
    const nutritionKeys = [
      "age",
      "sex",
      "height",
      "weight",
      "goal",
      "activity",
      "diet",
      "allergies",
      "restrictions",
      "cuisine",
      "meals",
      "sensitive",
    ] as const;
    const scheduleKeys = ["days", "workoutTime", "timezone"] as const;
    const changed = (keys: readonly (keyof typeof p)[]) =>
      keys.some((k) => JSON.stringify(previous[k]) !== JSON.stringify(p[k]));
    const updates = [
      statement(
        "UPDATE profiles SET data=?,updated_at=? WHERE user_id=?",
        JSON.stringify(p),
        now(),
        u.id,
      ),
    ];
    if (changed(nutritionKeys))
      updates.push(statement("DELETE FROM diet_plans WHERE user_id=?", u.id));
    if (changed(scheduleKeys))
      updates.push(
        statement(
          "DELETE FROM schedule WHERE user_id=? AND date>=? AND status='scheduled'",
          u.id,
          localDate(p.timezone),
        ),
      );
    await batch(updates);
    await ensureSchedule(u.id, p);
    return json({ profile: p });
  }
  if (path === "workouts" && req.method === "POST") {
    const w = await body(req, workoutSchema);
    if (w.source === "camera" && !w.metrics.length)
      throw new ApiError(
        400,
        "Capture a complete repetition or a valid plank interval before saving.",
      );
    const score =
      w.source === "manual"
        ? {
            score: null,
            form: null,
            rom: null,
            tempo: null,
            consistency: null,
            completion: null,
          }
        : w.exercise === "plank"
          ? plankScore(w.metrics, w.target)
          : performanceScore(w.metrics, w.target);
    const id = uid(),
      p = await getProfile(u.id),
      today = localDate(p.timezone),
      q = [
        statement(
          "INSERT INTO workouts (id,user_id,title,exercise,reps,sets,duration,resistance,rpe,score,form,rom,tempo,consistency,completion,source,metrics,notes,performed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
          id,
          u.id,
          w.title,
          w.exercise,
          w.reps,
          w.sets,
          w.duration,
          w.resistance,
          w.rpe,
          score.score,
          score.form,
          score.rom,
          score.tempo,
          score.consistency,
          score.completion,
          w.source,
          JSON.stringify(w.metrics),
          w.notes,
          now(),
        ),
      ];
    if (w.source !== "replay")
      q.push(
        statement(
          "UPDATE schedule SET status='completed' WHERE user_id=? AND date=?",
          u.id,
          today,
        ),
      );
    await batch(q);
    return json({ id, ...score }, 201);
  }
  if (path === "workouts" && req.method === "GET") {
    const url = new URL(req.url),
      page = Math.max(
        1,
        Math.min(10000, Number(url.searchParams.get("page")) || 1),
      );
    return json({
      items: await all(
        "SELECT * FROM workouts WHERE user_id=? ORDER BY performed_at DESC LIMIT 20 OFFSET ?",
        u.id,
        (page - 1) * 20,
      ),
      total: (
        await one("SELECT COUNT(*) n FROM workouts WHERE user_id=?", u.id)
      ).n,
    });
  }
  if (path.startsWith("workouts/") && req.method === "DELETE") {
    const w = await one(
      "SELECT * FROM workouts WHERE id=? AND user_id=?",
      path.split("/")[1],
      u.id,
    );
    if (!w) throw new ApiError(404, "Workout not found.");
    await run("DELETE FROM workouts WHERE id=? AND user_id=?", w.id, u.id);
    if (w.source !== "replay") {
      const p = await getProfile(u.id),
        date = localDate(p.timezone, new Date(w.performed_at));
      const remaining = await all(
        "SELECT performed_at FROM workouts WHERE user_id=? AND source!='replay' AND performed_at>=? AND performed_at<?",
        u.id,
        shiftDate(date, -1),
        shiftDate(date, 2),
      );
      if (
        !remaining.some(
          (x) => localDate(p.timezone, new Date(x.performed_at)) === date,
        )
      )
        await run(
          "UPDATE schedule SET status='scheduled' WHERE user_id=? AND date=? AND status='completed'",
          u.id,
          date,
        );
    }
    return json({ ok: true });
  }
  if (path === "nutrition/logs" && req.method === "POST") {
    const f = await body(req, foodSchema);
    const p = await getProfile(u.id),
      today = localDate(p.timezone);
    if (f.date > today || f.date < shiftDate(today, -365))
      throw new ApiError(400, "Choose a food-log date within the last year.");
    const id = uid();
    await run(
      "INSERT INTO nutrition_logs (id,user_id,food_name,calories,protein,carbs,fat,meal,quantity,date) VALUES (?,?,?,?,?,?,?,?,?,?)",
      id,
      u.id,
      f.food_name,
      f.calories,
      f.protein,
      f.carbs,
      f.fat,
      f.meal,
      f.quantity,
      f.date,
    );
    return json({ id }, 201);
  }
  if (path.startsWith("nutrition/logs/") && req.method === "DELETE") {
    const r = await run(
      "DELETE FROM nutrition_logs WHERE id=? AND user_id=?",
      path.split("/")[2],
      u.id,
    );
    if (!r.meta.changes) throw new ApiError(404, "Food log not found.");
    return json({ ok: true });
  }
  if (path === "nutrition/plan" && req.method === "POST") {
    const { variation } = await body(
        req,
        z.object({ variation: z.number().int().min(0).max(1000).default(0) }),
      ),
      p = await getProfile(u.id),
      date = localDate(p.timezone);
    const rows = await all(
      "SELECT * FROM catalog WHERE workspace_id=? AND kind='meals' AND active=1",
      u.workspace_id,
    );
    const items: CatalogItem[] = rows.map((x) => ({
      ...x,
      data: JSON.parse(x.data),
    }));
    let plan;
    try {
      plan = makeMealPlan(items, p, date, variation);
    } catch (e) {
      throw new ApiError(422, (e as Error).message);
    }
    await run(
      "INSERT INTO diet_plans (id,user_id,date,data) VALUES (?,?,?,?) ON CONFLICT(user_id,date) DO UPDATE SET data=excluded.data",
      plan.id,
      u.id,
      date,
      JSON.stringify(plan),
    );
    return json({ plan });
  }
  if (path === "nutrition/grocery" && req.method === "PUT") {
    const { checked } = await body(
        req,
        z.object({ checked: z.array(z.string().max(100)).max(100) }),
      ),
      p = await getProfile(u.id),
      date = localDate(p.timezone),
      row = await one(
        "SELECT data FROM diet_plans WHERE user_id=? AND date=?",
        u.id,
        date,
      );
    if (!row) throw new ApiError(404, "Generate a meal plan first.");
    const plan = { ...JSON.parse(row.data), checked };
    await run(
      "UPDATE diet_plans SET data=? WHERE user_id=? AND date=?",
      JSON.stringify(plan),
      u.id,
      date,
    );
    return json({ ok: true });
  }
  if (path === "schedule" && req.method === "POST") {
    const d = await body(
        req,
        z.object({
          date: dateSchema,
          time: timeSchema,
          title: z.string().trim().min(2).max(80),
        }),
      ),
      p = await getProfile(u.id),
      today = localDate(p.timezone);
    if (d.date < today || d.date > shiftDate(today, 180))
      throw new ApiError(
        400,
        "Choose a date between today and the next six months.",
      );
    await run(
      "INSERT INTO schedule (id,user_id,date,time,title,status) VALUES (?,?,?,?,?,?) ON CONFLICT(user_id,date) DO UPDATE SET title=excluded.title,time=excluded.time",
      uid(),
      u.id,
      d.date,
      d.time,
      d.title,
      "scheduled",
    );
    return json({ ok: true });
  }
  if (path.startsWith("schedule/") && req.method === "PATCH") {
    const d = await body(
        req,
        z.object({
          status: z.enum(["scheduled", "skipped"]),
          date: dateSchema.optional(),
        }),
      ),
      id = path.split("/")[1];
    const s = await one(
      "SELECT * FROM schedule WHERE id=? AND user_id=?",
      id,
      u.id,
    );
    if (!s) throw new ApiError(404, "Session not found.");
    if (s.status === "completed")
      throw new ApiError(400, "Completed sessions are kept in your history.");
    if (d.date) {
      const p = await getProfile(u.id),
        today = localDate(p.timezone);
      if (d.date < today || d.date > shiftDate(today, 180))
        throw new ApiError(400, "Choose a future date within six months.");
      if (
        await one(
          "SELECT id FROM schedule WHERE user_id=? AND date=? AND id!=?",
          u.id,
          d.date,
          id,
        )
      )
        throw new ApiError(409, "There is already a session on that day.");
    }
    await run(
      "UPDATE schedule SET date=?,status=? WHERE id=? AND user_id=?",
      d.date ?? s.date,
      d.status,
      id,
      u.id,
    );
    return json({ ok: true });
  }
  if (path === "schedule/adapt" && req.method === "POST") {
    const p = await getProfile(u.id),
      today = localDate(p.timezone),
      sessions = await all(
        "SELECT * FROM schedule WHERE user_id=? ORDER BY date",
        u.id,
      ),
      missed = sessions
        .filter((s) => s.date < today && s.status !== "completed")
        .at(-1);
    if (!missed) throw new ApiError(400, "No missed session needs moving.");
    let date = shiftDate(today, 1);
    for (let n = 1; n <= 30; n++) {
      const candidate = shiftDate(today, n);
      if (
        !sessions.some(
          (s) =>
            s.date === candidate ||
            s.date === shiftDate(candidate, -1) ||
            s.date === shiftDate(candidate, 1),
        )
      ) {
        date = candidate;
        break;
      }
      date = shiftDate(today, 31);
    }
    await run(
      "INSERT INTO schedule (id,user_id,date,time,title,status) VALUES (?,?,?,?,?,?)",
      uid(),
      u.id,
      date,
      p.workoutTime,
      `Recovery-paced: ${missed.title}`,
      "scheduled",
    );
    return json({
      date,
      message: `Added a recovery-paced session on ${date}, with a rest-day buffer.`,
    });
  }
  if (path === "recommendations" && req.method === "GET") {
    const s = await snapshot(u);
    return json({
      plans: recommendPlans(s.catalog.plans, s.profile, s.workouts),
    });
  }
  if (path === "plans/adopt" && req.method === "POST") {
    const { id } = await body(req, z.object({ id: z.string().uuid() })),
      row = await one(
        "SELECT * FROM catalog WHERE id=? AND workspace_id=? AND kind='plans' AND active=1",
        id,
        u.workspace_id,
      );
    if (!row) throw new ApiError(404, "Plan not found.");
    const p = await getProfile(u.id),
      d = JSON.parse(row.data);
    if (!d.equipment.every((e: string) => p.equipment.includes(e)))
      throw new ApiError(
        400,
        "Update your equipment or choose a plan that fits it.",
      );
    await run(
      "DELETE FROM schedule WHERE user_id=? AND date>=? AND status='scheduled'",
      u.id,
      localDate(p.timezone),
    );
    await ensureSchedule(u.id, p, row.name);
    return json({ ok: true });
  }
  if (path === "challenges/join" && req.method === "POST") {
    const { id } = await body(req, z.object({ id: z.string().uuid() }));
    if (
      !(await one(
        "SELECT id FROM catalog WHERE id=? AND workspace_id=? AND kind='challenges' AND active=1",
        id,
        u.workspace_id,
      ))
    )
      throw new ApiError(404, "Challenge not found.");
    await run(
      "INSERT OR IGNORE INTO challenge_joins (user_id,catalog_id,created_at) VALUES (?,?,?)",
      u.id,
      id,
      now(),
    );
    return json({ ok: true });
  }
  if (path === "notifications/read" && req.method === "POST") {
    const { id } = await body(
      req,
      z.object({ id: z.string().max(150).optional() }),
    );
    if (id)
      await run(
        "UPDATE notifications SET read_at=? WHERE id=? AND user_id=?",
        now(),
        id,
        u.id,
      );
    else
      await run(
        "UPDATE notifications SET read_at=? WHERE user_id=?",
        now(),
        u.id,
      );
    return json({ ok: true });
  }
  if (path === "account/name" && req.method === "PUT") {
    const { name } = await body(
      req,
      z.object({ name: z.string().trim().min(2).max(80) }),
    );
    await run("UPDATE users SET name=? WHERE id=?", name, u.id);
    return json({ ok: true });
  }
  if (path === "account/export" && req.method === "GET") {
    const s = await snapshot(u);
    return json(
      {
        exportedAt: now(),
        ...s,
        workouts: await all("SELECT * FROM workouts WHERE user_id=?", u.id),
        logs: await all("SELECT * FROM nutrition_logs WHERE user_id=?", u.id),
        messages: await all(
          "SELECT m.* FROM messages m JOIN chat_sessions c ON m.session_id=c.id WHERE c.user_id=?",
          u.id,
        ),
        schedule: await all("SELECT * FROM schedule WHERE user_id=?", u.id),
        dietPlans: await all("SELECT * FROM diet_plans WHERE user_id=?", u.id),
        readings: await all(
          "SELECT r.* FROM readings r JOIN devices d ON r.device_id=d.id WHERE d.user_id=?",
          u.id,
        ),
      },
      200,
      {
        "Content-Disposition": 'attachment; filename="form-personal-data.json"',
      },
    );
  }
  if (path === "account" && req.method === "DELETE") {
    await rateLimit(`delete:${u.id}`, 5);
    const d = await body(
      req,
      z.object({
        confirmation: z.literal("DELETE"),
        password: z.string().max(128).default(""),
      }),
    );
    const full = await one("SELECT password_hash FROM users WHERE id=?", u.id);
    if (
      !u.demo &&
      !(await verifyPassword(d.password ?? "", full.password_hash))
    )
      throw new ApiError(
        400,
        "Confirm your current password to delete your account.",
      );
    const count = await one(
      "SELECT COUNT(*) n FROM users WHERE workspace_id=? AND demo=0",
      u.workspace_id,
    );
    if (u.demo || count.n === 1)
      await run("DELETE FROM workspaces WHERE id=?", u.workspace_id);
    else await run("DELETE FROM users WHERE id=?", u.id);
    return json({ ok: true }, 200, { "Set-Cookie": cookie(req, "", 0) });
  }
  if (path === "issues" && req.method === "POST") {
    const d = await body(
      req,
      z.object({
        title: z.string().trim().min(3).max(100),
        body: z.string().trim().min(5).max(1500),
      }),
    );
    await run(
      "INSERT INTO issues (id,workspace_id,user_id,title,body,status,created_at) VALUES (?,?,?,?,?,?,?)",
      uid(),
      u.workspace_id,
      u.id,
      d.title,
      d.body,
      "open",
      now(),
    );
    return json({ ok: true }, 201);
  }
  return null;
}
