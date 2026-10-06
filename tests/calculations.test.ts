import { describe, it, expect } from "vitest";
import {
  nutritionTargets,
  allowedMeal,
  makeMealPlan,
  groceryList,
} from "@/lib/algorithms/nutrition";
import { performanceScore } from "@/lib/algorithms/performance";
import { habitScore, localDate, shiftDate } from "@/lib/algorithms/habits";
import {
  angle,
  PoseEngine,
  syntheticPose,
  plankScore,
} from "@/lib/algorithms/pose";
import {
  DEFAULT_PROFILE,
  type ExerciseId,
  type CatalogItem,
  type Schedule,
  type Workout,
} from "@/lib/types";
import { CATALOG } from "@/lib/catalog";
const recipes = CATALOG.filter((x) => x.kind === "meals").map((x, i) => ({
  ...x,
  id: String(i),
  active: 1,
})) as CatalogItem[];
describe("Nutrition formulas and restrictions", () => {
  it("matches a hand-calculated Mifflin–St Jeor case", () => {
    const n = nutritionTargets({
      ...DEFAULT_PROFILE,
      sex: "male",
      age: 30,
      height: 180,
      weight: 80,
      activity: "moderate",
    });
    expect(n).toMatchObject({
      bmi: 24.7,
      bmr: 1780,
      tdee: 2759,
      calories: 2759,
      protein: 128,
      fat: 92,
      carbs: 355,
      blocked: false,
    });
  });
  it("reports the coefficient range when sex is unspecified", () => {
    const n = nutritionTargets({
      ...DEFAULT_PROFILE,
      age: 30,
      height: 180,
      weight: 80,
    });
    expect(n.bmr).toBe(1697);
    expect(n.bmrRange).toEqual([1614, 1780]);
  });
  it("limits the deficit and preserves the BMR floor", () => {
    const n = nutritionTargets({
      ...DEFAULT_PROFILE,
      sex: "male",
      age: 30,
      height: 180,
      weight: 80,
      goal: "fat_loss",
    });
    expect(n.calories).toBe(2409);
    expect(n.calories!).toBeGreaterThanOrEqual(n.bmr);
  });
  it.each([
    { sensitive: true },
    { age: 17 },
    { height: 180, weight: 50, goal: "fat_loss" as const },
  ])("pauses targets for health-sensitive profiles %j", (part) => {
    const p = { ...DEFAULT_PROFILE, ...part };
    expect(nutritionTargets(p).calories).toBeNull();
    expect(() => makeMealPlan(recipes, p, "2026-09-27")).toThrow();
  });
  it("never relaxes vegan, allergen, or ingredient exclusions to fill a plan", () => {
    const p = {
      ...DEFAULT_PROFILE,
      diet: "vegan" as const,
      allergies: ["Soy", "Peanut"],
      restrictions: "chickpea",
      cuisine: "any" as const,
    };
    const plan = makeMealPlan(recipes, p, "2026-09-27");
    for (const meal of plan.meals) {
      const original = recipes.find((x) => x.id === meal.id)!;
      expect(allowedMeal(original, p)).toBe(true);
      expect(original.data.diet).toBe("vegan");
      expect(JSON.stringify(meal.ingredients).toLowerCase()).not.toContain(
        "chickpea",
      );
    }
    expect(plan.totals.calories).toBe(
      plan.meals.reduce((s, x) => s + x.calories, 0),
    );
  });
  it("fails clearly if every available recipe is excluded", () => {
    expect(() =>
      makeMealPlan(
        recipes,
        {
          ...DEFAULT_PROFILE,
          restrictions: recipes.map((x) => x.name).join(","),
        },
        "2026-09-27",
      ),
    ).toThrow("No recipes");
  });
  it.each([2, 3, 4, 5, 6])(
    "creates %i meals and aggregates grocery quantities",
    (meals) => {
      const p = makeMealPlan(
        recipes,
        { ...DEFAULT_PROFILE, meals },
        "2026-09-27",
      );
      expect(p.meals).toHaveLength(meals);
      const groceries = groceryList(p);
      expect(new Set(groceries.map((x) => x.name)).size).toBe(groceries.length);
      expect(groceries.reduce((s, x) => s + x.grams, 0)).toBe(
        p.meals.flatMap((x) => x.ingredients).reduce((s, x) => s + x.grams, 0),
      );
    },
  );
});
describe("Performance scoring", () => {
  const rep = { duration: 4, range: 80, form: 90, tempo: 100 };
  it("computes weighted metrics rather than random scores", () =>
    expect(performanceScore([rep, rep], 4)).toEqual({
      score: 87,
      form: 90,
      rom: 80,
      tempo: 100,
      consistency: 100,
      completion: 50,
    }));
  it("uses the coefficient of variation for rep duration", () =>
    expect(
      performanceScore(
        [
          { ...rep, duration: 2 },
          { ...rep, duration: 6 },
        ],
        2,
      ).consistency,
    ).toBe(50));
  it("does not invent consistency for one repetition", () => {
    const r = performanceScore([rep], 1);
    expect(r.consistency).toBeNull();
    expect(r.score).toBe(90);
  });
  it("does not score missing evidence", () =>
    expect(performanceScore([], 10).score).toBeNull());
  it("scores plank alignment and hold completion without artificial ROM", () =>
    expect(plankScore([{ ...rep, duration: 10 }], 20)).toEqual({
      score: 78,
      form: 90,
      rom: null,
      tempo: null,
      consistency: null,
      completion: 50,
    }));
});
describe("Habit scoring and calendar semantics", () => {
  const s = (date: string, status: Schedule["status"]): Schedule => ({
    id: date,
    date,
    status,
    title: "Workout",
    time: "18:00",
  });
  it("does not count future or not-yet-due workouts as misses", () => {
    const r = habitScore(
      [
        s("2026-09-21", "completed"),
        s("2026-09-23", "completed"),
        s("2026-09-25", "completed"),
        s("2026-09-27", "scheduled"),
        s("2026-09-28", "scheduled"),
      ],
      [],
      "2026-09-27",
    );
    expect(r.consistency).toBe(100);
    expect(r.streak).toBe(3);
    expect(r.risk).toBe(0);
  });
  it("keeps cold-start scoring explicitly uncalibrated", () =>
    expect(habitScore([], [], "2026-09-27")).toMatchObject({
      coldStart: true,
      risk: 0,
    }));
  it("raises risk for missed sessions and mood without claiming probability", () => {
    const schedule = [
      s("2026-09-21", "skipped"),
      s("2026-09-23", "scheduled"),
      s("2026-09-25", "skipped"),
    ];
    expect(habitScore(schedule, [], "2026-09-27", true).risk).toBe(55);
  });
  it("ignores replay workouts in elapsed-time and preferred-time signals", () => {
    const w = [
      { source: "replay", performed_at: "2026-09-26T10:00:00Z" },
    ] as Workout[];
    expect(habitScore([], w, "2026-09-27").daysSince).toBeNull();
  });
  it("handles timezone midnight and leap-day boundaries", () => {
    expect(localDate("Asia/Kolkata", new Date("2026-09-27T20:00:00Z"))).toBe(
      "2026-09-28",
    );
    expect(shiftDate("2024-02-28", 1)).toBe("2024-02-29");
  });
});
describe("Pose geometry and state machine", () => {
  it("calculates a 3D right angle and rejects zero-length vectors", () => {
    expect(angle({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(
      90,
    );
    expect(
      Number.isNaN(angle({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 })),
    ).toBe(true);
  });
  it.each<ExerciseId>(["squat", "pushup", "curl", "press", "lunge"])(
    "counts complete %s cycles from a deterministic landmark fixture",
    (exercise) => {
      const engine = new PoseEngine(exercise);
      for (let ms = 0; ms <= 12600; ms += 50)
        engine.update(syntheticPose(exercise, ms / 1000), ms + 1000);
      expect(engine.reps).toHaveLength(3);
      expect(engine.reps.every((x) => x.range > 75 && x.duration > 0.8)).toBe(
        true,
      );
    },
  );
  it("does not count a stationary pose", () => {
    const e = new PoseEngine("squat");
    for (let ms = 0; ms < 10000; ms += 50)
      e.update(syntheticPose("squat", 0), ms + 1000);
    expect(e.reps).toHaveLength(0);
  });
  it("drops a partial rep when landmarks disappear", () => {
    const e = new PoseEngine("curl");
    for (let ms = 0; ms < 2100; ms += 50)
      e.update(syntheticPose("curl", ms / 1000), ms + 1000);
    e.update([], 3150);
    for (let ms = 2150; ms < 4300; ms += 50)
      e.update(syntheticPose("curl", ms / 1000), ms + 1000);
    expect(e.reps).toHaveLength(0);
  });
  it("counts only visible aligned plank time", () => {
    const e = new PoseEngine("plank");
    for (let ms = 0; ms <= 5000; ms += 50)
      e.update(syntheticPose("plank", 0), ms + 1000);
    expect(e.holdSeconds).toBeCloseTo(5);
    for (let ms = 5050; ms < 7000; ms += 50) e.update([], ms + 1000);
    expect(e.holdSeconds).toBeCloseTo(5);
    expect(e.reps.length).toBeGreaterThanOrEqual(4);
  });
  it("refuses a standing push-up interpretation", () => {
    const state = new PoseEngine("pushup").update(
      syntheticPose("curl", 0),
      1000,
    );
    expect(state.visible).toBe(false);
    expect(state.feedback).toContain("horizontal");
  });
});
