import type { CatalogItem, Profile, Reading, Workout } from "../types";
export function recommendPlans(
  items: CatalogItem[],
  p: Profile,
  history: Workout[],
) {
  return items
    .filter((x) => x.active)
    .map((x) => {
      const d = x.data,
        reasons: string[] = [];
      let score = 0;
      if ((d.goals ?? []).includes(p.goal)) {
        score += 35;
        reasons.push("Matches your fitness goal");
      }
      if (d.level === p.experience || d.level === "all") {
        score += 20;
        reasons.push("Fits your experience");
      }
      const available = (d.equipment ?? []).every((e: string) =>
        p.equipment.includes(e),
      );
      if (available) {
        score += 25;
        reasons.push("Uses your available equipment");
      }
      if (d.days <= p.days.length) {
        score += 10;
        reasons.push("Fits your weekly schedule");
      }
      const latest = history
        .filter((w) => w.score !== null && w.source !== "replay")
        .slice(0, 3);
      if (
        !latest.length ||
        latest.every((w) => (w.score ?? 0) >= 65) ||
        d.level === "beginner"
      ) {
        score += 10;
        reasons.push("Appropriate for recent performance");
      }
      return { ...x, match: score, reasons, available };
    })
    .sort(
      (a, b) => Number(b.available) - Number(a.available) || b.match - a.match,
    );
}
export function equipmentAdvice(r: Reading, previous?: Reading) {
  const progress =
    r.rpe <= 6 &&
    r.form >= 85 &&
    previous &&
    previous.rpe <= 6 &&
    previous.form >= 85;
  const reduce = r.rpe >= 9 || r.form < 65;
  return {
    resistance:
      Math.round(
        (reduce
          ? r.resistance * 0.9
          : progress
            ? r.resistance * 1.025
            : r.resistance) * 4,
      ) / 4,
    rest: r.rpe >= 8 ? 150 : r.rpe >= 6 ? 90 : 60,
    intensity: r.rpe >= 8 ? "High" : r.rpe >= 5 ? "Moderate" : "Light",
    reason: reduce
      ? "Reduce the load and focus on control."
      : progress
        ? "Two controlled sets: consider a small increase if comfortable."
        : "Keep the load steady while you build consistent technique.",
    warning:
      r.heart_rate && r.heart_rate > 190
        ? "High device reading. Pause, check the sensor, and assess how you feel."
        : null,
  };
}
export function distanceKm(a: number, b: number, c: number, d: number) {
  const rad = (x: number) => (x * Math.PI) / 180;
  const h =
    Math.sin(rad(c - a) / 2) ** 2 +
    Math.cos(rad(a)) * Math.cos(rad(c)) * Math.sin(rad(d - b) / 2) ** 2;
  return (
    Math.round(6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) * 10) / 10
  );
}
