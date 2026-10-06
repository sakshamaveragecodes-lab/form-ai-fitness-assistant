import { describe, it, expect } from "vitest";
import {
  equipmentAdvice,
  recommendPlans,
  distanceKm,
} from "@/lib/algorithms/recommendations";
import {
  sentiment,
  safetyResponse,
  fallbackReply,
} from "@/lib/algorithms/buddy";
import {
  DEFAULT_PROFILE,
  type CatalogItem,
  type Reading,
  type Snapshot,
  type ChatMessage,
} from "@/lib/types";
import { nutritionTargets } from "@/lib/algorithms/nutrition";
import { habitScore } from "@/lib/algorithms/habits";
import { CATALOG } from "@/lib/catalog";
describe("Explainable recommendations", () => {
  it("prioritizes plans that can be done with owned equipment", () => {
    const items = CATALOG.filter((x) => x.kind === "plans").map((x, i) => ({
      ...x,
      id: String(i),
      active: 1,
    })) as CatalogItem[];
    const plans = recommendPlans(items, DEFAULT_PROFILE, []);
    expect(plans[0].available).toBe(true);
    expect(plans[0].reasons).toContain("Uses your available equipment");
    expect(plans.every((x) => x.match >= 0 && x.match <= 100)).toBe(true);
  });
  it("does not increase load after one set and reduces it for poor form", () => {
    const r = { resistance: 20, rpe: 5, form: 90, heart_rate: 120 } as Reading;
    expect(equipmentAdvice(r).resistance).toBe(20);
    expect(equipmentAdvice(r, r).resistance).toBe(20.5);
    expect(equipmentAdvice({ ...r, form: 50 }, r).resistance).toBe(18);
    expect(equipmentAdvice({ ...r, rpe: 9 }, r).rest).toBe(150);
  });
  it("uses geodesic distance rather than invented rankings", () => {
    expect(distanceKm(0, 0, 0, 1)).toBeCloseTo(111.2, 1);
    expect(distanceKm(20, 73, 20, 73)).toBe(0);
  });
});
describe("Guided buddy context and boundaries", () => {
  it("marks simple sentiment transparently with limited negation support", () => {
    expect(sentiment("I am tired")).toBe("low_energy");
    expect(sentiment("I am not tired")).toBe("neutral");
    expect(sentiment("I feel proud")).toBe("positive");
  });
  it.each([
    "chest pain",
    "I faint when lifting",
    "starve myself",
    "steroid dosage",
    "sharp pain",
    "I am pregnant",
    "kill myself",
  ])("routes %s to a safety response", (text) =>
    expect(safetyResponse(text)).toBeTruthy(),
  );
  it("uses actual profile targets and short follow-up context", () => {
    const s = {
      profile: DEFAULT_PROFILE,
      nutrition: nutritionTargets(DEFAULT_PROFILE),
      habits: habitScore([], [], "2026-09-27"),
      workouts: [],
      plan: null,
      schedule: [],
      today: "2026-09-27",
    } as unknown as Snapshot;
    const history = [
      { role: "user", content: "Help with meal planning" },
    ] as ChatMessage[];
    const r = fallbackReply("tell me more", s, history);
    expect(r.mode).toBe("guided");
    expect(r.content).toContain(String(s.nutrition.calories));
    expect(r.content).toContain("ingredient labels");
  });
});
