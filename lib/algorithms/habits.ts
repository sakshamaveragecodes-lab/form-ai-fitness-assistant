import type { Schedule, Workout } from "../types";
import { clamp } from "./nutrition";
export function localDate(
  timezone = "Asia/Kolkata",
  date = new Date(),
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
export function shiftDate(date: string, offset: number) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}
export function habitScore(
  schedule: Schedule[],
  workouts: Workout[],
  today: string,
  negativeMood = false,
  timezone = "Asia/Kolkata",
) {
  const due = schedule.filter(
    (x) => x.date < today && x.date >= shiftDate(today, -28),
  );
  const week = due.filter((x) => x.date >= shiftDate(today, -7));
  const done = week.filter((x) => x.status === "completed").length;
  const consistency = week.length ? Math.round((done / week.length) * 100) : 0;
  const actual = workouts
    .filter((x) => x.source !== "replay")
    .sort((a, b) => b.performed_at.localeCompare(a.performed_at));
  const daysSince = actual.length
    ? Math.max(
        0,
        Math.round(
          (Date.parse(today + "T12:00:00Z") -
            Date.parse(
              localDate(timezone, new Date(actual[0].performed_at)) +
                "T12:00:00Z",
            )) /
            86400000,
        ),
      )
    : null;
  const missed = due.length
    ? due.filter((x) => x.status !== "completed").length / due.length
    : 0;
  const older = due.filter((x) => x.date < shiftDate(today, -7));
  const oldRate = older.length
    ? older.filter((x) => x.status === "completed").length / older.length
    : 0;
  const recentRate = week.length ? done / week.length : oldRate;
  const risk = Math.round(
    clamp(
      missed * 45 +
        Math.min((daysSince ?? 0) / 7, 1) * 25 +
        Math.max(0, oldRate - recentRate) * 20 +
        (negativeMood ? 10 : 0),
      0,
      100,
    ),
  );
  let streak = 0;
  for (const s of [...schedule]
    .filter((x) => x.date <= today)
    .sort((a, b) => b.date.localeCompare(a.date))) {
    if (s.date === today && s.status === "scheduled") continue;
    if (s.status === "completed") streak++;
    else break;
  }
  const hours = actual
    .slice(0, 30)
    .map((x) =>
      new Intl.DateTimeFormat("en-GB", {
        timeZone: timezone,
        hour: "2-digit",
        hour12: false,
      }).format(new Date(x.performed_at)),
    );
  const counts = hours.reduce<Record<string, number>>(
    (a, h) => ({ ...a, [h]: (a[h] ?? 0) + 1 }),
    {},
  );
  const preferred = Object.keys(counts).sort(
    (a, b) => counts[b] - counts[a],
  )[0];
  const coldStart = due.length < 3;
  return {
    consistency,
    streak,
    risk: coldStart ? 0 : risk,
    label: coldStart
      ? "Building your baseline"
      : risk >= 60
        ? "Plan a lighter session"
        : risk >= 30
          ? "A little support helps"
          : "Steady rhythm",
    reasons: coldStart
      ? ["Complete three scheduled sessions to build a useful baseline."]
      : [
          `${Math.round(missed * 100)}% of the past 28 days’ due sessions were missed.`,
          `${daysSince ?? 0} days since your most recent workout.`,
          negativeMood
            ? "Recent messages suggest low energy; consider an easier session."
            : "No recent low-energy signal used.",
        ],
    due: week.length,
    done,
    daysSince,
    preferredTime: preferred ? `${preferred}:00` : "Not enough history",
    coldStart,
  };
}
