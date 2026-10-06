import { habitScore, localDate, shiftDate } from "../algorithms/habits";
import { nutritionTargets } from "../algorithms/nutrition";
import type {
  CatalogKind,
  Profile,
  Schedule,
  Snapshot,
  User,
  Workout,
} from "../types";
import { DEFAULT_PROFILE } from "../types";
import { all, batch, now, one, run, runtime, statement, uid } from "./db";
export async function getProfile(userId: string): Promise<Profile> {
  const p = await one("SELECT data FROM profiles WHERE user_id=?", userId);
  return p ? JSON.parse(p.data) : DEFAULT_PROFILE;
}
export async function ensureSchedule(
  userId: string,
  p: Profile,
  title = "Full body foundation",
) {
  const today = localDate(p.timezone);
  const q = [];
  for (let i = 0; i < 15; i++) {
    const date = shiftDate(today, i);
    if (p.days.includes(new Date(date + "T12:00:00Z").getUTCDay()))
      q.push(
        statement(
          "INSERT OR IGNORE INTO schedule (id,user_id,date,time,title,status) VALUES (?,?,?,?,?,?)",
          uid(),
          userId,
          date,
          p.workoutTime,
          title,
          "scheduled",
        ),
      );
  }
  await batch(q);
}
export async function snapshot(u: User): Promise<Snapshot> {
  const p = await getProfile(u.id),
    today = localDate(p.timezone);
  if (p.onboarded) await ensureSchedule(u.id, p);
  const [
    workoutRows,
    schedule,
    logs,
    catalogRows,
    devices,
    messages,
    plan,
    joined,
  ] = await Promise.all([
    all(
      "SELECT * FROM workouts WHERE user_id=? ORDER BY performed_at DESC LIMIT 200",
      u.id,
    ),
    all<Schedule>(
      "SELECT * FROM schedule WHERE user_id=? AND date>=? ORDER BY date",
      u.id,
      shiftDate(today, -35),
    ),
    all(
      "SELECT * FROM nutrition_logs WHERE user_id=? AND date>=? ORDER BY date DESC",
      u.id,
      shiftDate(today, -30),
    ),
    all(
      "SELECT * FROM catalog WHERE workspace_id=? AND active=1 ORDER BY kind,name",
      u.workspace_id,
    ),
    all(
      "SELECT id,name,exercise,mode,active FROM devices WHERE user_id=? ORDER BY created_at",
      u.id,
    ),
    all(
      "SELECT m.* FROM messages m JOIN chat_sessions c ON m.session_id=c.id WHERE c.user_id=? ORDER BY m.created_at DESC LIMIT 60",
      u.id,
    ),
    one("SELECT data FROM diet_plans WHERE user_id=? AND date=?", u.id, today),
    all("SELECT catalog_id FROM challenge_joins WHERE user_id=?", u.id),
  ]);
  const workouts: Workout[] = workoutRows.map((w) => ({
    ...w,
    metrics: JSON.parse(w.metrics),
  }));
  const habits = habitScore(
    schedule,
    workouts,
    today,
    messages
      .slice(0, 6)
      .some((x) => x.role === "user" && x.sentiment === "low_energy"),
    p.timezone,
  );
  const todays = schedule.find(
    (s) => s.date === today && s.status === "scheduled",
  );
  if (p.reminders && todays)
    await run(
      "INSERT OR IGNORE INTO notifications (id,user_id,title,body,kind,created_at) VALUES (?,?,?,?,?,?)",
      `${u.id}:reminder:${today}`,
      u.id,
      `Your session is at ${todays.time}`,
      habits.risk >= 30
        ? "Keep it manageable: a shorter session still helps you keep your rhythm."
        : `${todays.title}. Give yourself a few minutes to warm up.`,
      "reminder",
      now(),
    );
  const notifications = await all(
    "SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50",
    u.id,
  );
  const readingRows = devices.length
    ? await all(
        "SELECT * FROM (SELECT r.*,ROW_NUMBER() OVER (PARTITION BY r.device_id ORDER BY r.sequence DESC) AS row_num FROM readings r JOIN devices d ON r.device_id=d.id WHERE d.user_id=?) WHERE row_num<=30",
        u.id,
      )
    : [];
  const catalog: Snapshot["catalog"] = {
    exercises: [],
    plans: [],
    meals: [],
    challenges: [],
    gyms: [],
    content: [],
  };
  for (const x of catalogRows)
    catalog[x.kind as CatalogKind].push({ ...x, data: JSON.parse(x.data) });
  return {
    user: u,
    profile: p,
    nutrition: nutritionTargets(p),
    workouts,
    schedule,
    logs,
    catalog,
    notifications,
    devices: devices.map((d) => ({
      ...d,
      readings: readingRows.filter((r) => r.device_id === d.id),
    })),
    messages: messages.reverse(),
    plan: plan ? JSON.parse(plan.data) : null,
    habits,
    joined: joined.map((x) => x.catalog_id),
    today,
    providerAvailable: !!runtime().LLM_API_KEY,
  };
}
