import { z } from "zod";
import type { User } from "../../types";
import { ApiError, json, now, one, run, uid } from "../db";
import { digest, randomToken, rateLimit } from "../security";
import { body, exerciseEnum, readingSchema } from "../validation";
export async function ingestDevice(req: Request): Promise<Response> {
  const token = req.headers.get("authorization")?.replace(/^Device /, "") ?? "";
  if (!/^[a-f0-9]{64}$/.test(token))
    throw new ApiError(401, "Valid device credentials are required.");
  const d = await one(
    "SELECT * FROM devices WHERE token_hash=? AND mode='hardware' AND active=1",
    await digest(token),
  );
  if (!d) throw new ApiError(401, "Device credentials are invalid or revoked.");
  await rateLimit(`device:${d.id}`, 60, 60000);
  const r = await body(req, readingSchema),
    existing = await one(
      "SELECT id FROM readings WHERE device_id=? AND sequence=?",
      d.id,
      r.sequence,
    );
  if (existing)
    return json({ accepted: true, duplicate: true, id: existing.id });
  const last = await one(
    "SELECT MAX(sequence) seq FROM readings WHERE device_id=?",
    d.id,
  );
  if (last.seq !== null && r.sequence <= last.seq)
    throw new ApiError(409, "Sequence must increase for this device.");
  const id = uid();
  await run(
    "INSERT INTO readings (id,device_id,sequence,resistance,reps,duration,rest,heart_rate,rpe,form,source,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
    id,
    d.id,
    r.sequence,
    r.resistance,
    r.reps,
    r.duration,
    r.rest,
    r.heart_rate,
    r.rpe,
    r.form,
    r.simulated ? "simulated" : "hardware",
    now(),
  );
  await prune(d.id);
  return json({ accepted: true, id }, 201);
}
async function prune(id: string) {
  await run(
    "DELETE FROM readings WHERE device_id=? AND id NOT IN (SELECT id FROM readings WHERE device_id=? ORDER BY sequence DESC LIMIT 1000)",
    id,
    id,
  );
}
export async function deviceRoute(
  req: Request,
  path: string,
  u: User,
): Promise<Response | null> {
  if (path === "devices" && req.method === "POST") {
    const d = await body(
      req,
      z.object({
        name: z.string().trim().min(2).max(80),
        exercise: exerciseEnum,
        mode: z.enum(["simulated", "hardware"]),
      }),
    );
    const id = uid(),
      token = d.mode === "hardware" ? randomToken() : null;
    if (
      (await one("SELECT COUNT(*) n FROM devices WHERE user_id=?", u.id)).n >=
      10
    )
      throw new ApiError(400, "You can connect up to ten devices.");
    await run(
      "INSERT INTO devices (id,workspace_id,user_id,name,exercise,mode,token_hash,active,created_at) VALUES (?,?,?,?,?,?,?,1,?)",
      id,
      u.workspace_id,
      u.id,
      d.name,
      d.exercise,
      d.mode,
      token ? await digest(token) : null,
      now(),
    );
    return json({ id, deviceToken: token }, 201);
  }
  if (path.startsWith("devices/")) {
    const [, id, action] = path.split("/"),
      d = await one("SELECT * FROM devices WHERE id=? AND user_id=?", id, u.id);
    if (!d) throw new ApiError(404, "Device not found.");
    if (action === "simulate" && req.method === "POST") {
      if (d.mode !== "simulated" || !d.active)
        throw new ApiError(
          400,
          "Enable a simulated device to use this action.",
        );
      await rateLimit(`simulation:${u.id}`, 120, 60000);
      const last = await one(
          "SELECT COALESCE(MAX(sequence),0) seq FROM readings WHERE device_id=?",
          id,
        ),
        sequence = last.seq + 1;
      const r = {
        resistance: 10,
        reps: 8 + (sequence % 5),
        duration: 32 + (sequence % 5) * 3,
        rest: 60 + (sequence % 3) * 15,
        heart_rate: 108 + (sequence % 8) * 3,
        rpe: 5 + (sequence % 4),
        form: 86 + (sequence % 7),
      };
      await run(
        "INSERT INTO readings (id,device_id,sequence,resistance,reps,duration,rest,heart_rate,rpe,form,source,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        uid(),
        id,
        sequence,
        r.resistance,
        r.reps,
        r.duration,
        r.rest,
        r.heart_rate,
        r.rpe,
        r.form,
        "simulated",
        now(),
      );
      await prune(id);
      return json({ reading: { ...r, sequence, source: "simulated" } });
    }
    if (action === "rotate" && req.method === "POST") {
      if (d.mode !== "hardware")
        throw new ApiError(400, "Simulated devices do not use tokens.");
      const token = randomToken();
      await run(
        "UPDATE devices SET token_hash=? WHERE id=?",
        await digest(token),
        id,
      );
      return json({ deviceToken: token });
    }
    if (req.method === "PATCH") {
      const { active } = await body(req, z.object({ active: z.boolean() }));
      await run("UPDATE devices SET active=? WHERE id=?", active ? 1 : 0, id);
      return json({ ok: true });
    }
    if (req.method === "DELETE") {
      await run("DELETE FROM devices WHERE id=? AND user_id=?", id, u.id);
      return json({ ok: true });
    }
  }
  return null;
}
