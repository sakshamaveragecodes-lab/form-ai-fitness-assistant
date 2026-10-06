import type { CatalogItem, Meal, MealPlan, Nutrition, Profile } from "../types";
export const clamp = (x: number, a: number, b: number) =>
  Math.max(a, Math.min(b, x));
export function nutritionTargets(p: Profile): Nutrition {
  const base = 10 * p.weight + 6.25 * p.height - 5 * p.age;
  const bmr = base + (p.sex === "male" ? 5 : p.sex === "female" ? -161 : -78);
  const tdee =
    bmr *
    { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 }[p.activity];
  const bmi = p.weight / (p.height / 100) ** 2;
  const blocked =
    p.sensitive || p.age < 18 || (bmi < 18.5 && p.goal === "fat_loss");
  const calories = Math.round(
    Math.max(
      bmr,
      tdee +
        (p.goal === "fat_loss"
          ? -Math.min(350, tdee * 0.15)
          : p.goal === "muscle"
            ? Math.min(250, tdee * 0.1)
            : 0),
    ),
  );
  const protein = Math.round(p.weight * 1.6),
    fat = Math.round((calories * 0.3) / 9),
    carbs = Math.round((calories - protein * 4 - fat * 9) / 4);
  return {
    bmi: Math.round(bmi * 10) / 10,
    bmr: Math.round(bmr),
    bmrRange:
      p.sex === "unspecified"
        ? [Math.round(base - 161), Math.round(base + 5)]
        : null,
    tdee: Math.round(tdee),
    calories: blocked ? null : calories,
    protein: blocked ? null : protein,
    fat: blocked ? null : fat,
    carbs: blocked ? null : carbs,
    blocked,
    note: blocked
      ? "Personal calorie targets are paused. A registered dietitian can tailor a plan for your circumstances."
      : p.sex === "unspecified"
        ? "BMR uses the midpoint of the equation’s two sex coefficients. Treat this as a rough starting estimate."
        : "Estimates for generally healthy adults. Adjust with a qualified professional and your longer-term progress.",
  };
}
export function allowedMeal(item: CatalogItem, p: Profile): boolean {
  const d = item.data;
  if (p.diet === "vegan" && d.diet !== "vegan") return false;
  if (p.diet === "vegetarian" && d.diet === "omnivore") return false;
  if (
    p.allergies.some((a) =>
      (d.allergens ?? [])
        .map((x: string) => x.toLowerCase())
        .includes(a.toLowerCase()),
    )
  )
    return false;
  const restrictions = p.restrictions
    .toLowerCase()
    .split(/[,;\n]/)
    .map((x) => x.trim())
    .filter(Boolean);
  const description = JSON.stringify([item.name, d.ingredients]).toLowerCase();
  if (restrictions.some((x) => description.includes(x))) return false;
  return !!item.active;
}
export function makeMealPlan(
  items: CatalogItem[],
  p: Profile,
  date: string,
  variation = 0,
): MealPlan {
  const target = nutritionTargets(p);
  if (target.blocked) throw new Error(target.note);
  const compatible = items.filter((x) => allowedMeal(x, p));
  if (!compatible.length)
    throw new Error(
      "No recipes match all your restrictions. Keep your restrictions in place and add a suitable recipe through your administrator.",
    );
  const chosen: CatalogItem[] = [];
  const slots =
    p.meals === 2
      ? ["Lunch", "Dinner"]
      : p.meals === 3
        ? ["Breakfast", "Lunch", "Dinner"]
        : ["Breakfast", "Lunch", "Dinner", ...Array(p.meals - 3).fill("Snack")];
  slots.forEach((slot, i) => {
    let options = compatible.filter(
      (x) =>
        x.data.slot === slot &&
        (p.cuisine === "any" ||
          x.data.cuisine === p.cuisine ||
          slot === "Snack"),
    );
    if (!options.length)
      options = compatible.filter((x) => x.data.slot === slot);
    if (!options.length) options = compatible;
    chosen.push(options[(variation + i) % options.length]);
  });
  const baseKcal = chosen.reduce((a, x) => a + x.data.calories, 0);
  const scale = clamp((target.calories ?? 2000) / baseKcal, 0.5, 2.5);
  const meals: Meal[] = chosen.map((x, i) => ({
    id: x.id,
    name: x.name,
    slot: slots[i],
    servings: Math.round(scale * 100) / 100,
    calories: Math.round(x.data.calories * scale),
    protein: Math.round(x.data.protein * scale),
    carbs: Math.round(x.data.carbs * scale),
    fat: Math.round(x.data.fat * scale),
    allergens: x.data.allergens,
    ingredients: x.data.ingredients.map(
      (g: { name: string; grams: number }) => ({
        name: g.name,
        grams: Math.round(g.grams * scale),
      }),
    ),
    instructions: x.data.instructions,
  }));
  const totals = meals.reduce(
    (a, x) => ({
      calories: a.calories + x.calories,
      protein: a.protein + x.protein,
      carbs: a.carbs + x.carbs,
      fat: a.fat + x.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  const warnings = [
    "Recipe nutrition is estimated. Check ingredient labels and cross-contamination warnings for allergies.",
  ];
  if (Math.abs(totals.protein - (target.protein ?? 0)) > 20)
    warnings.push(
      `This plan provides ${totals.protein} g protein; your estimated target is ${target.protein} g. ${totals.protein < (target.protein ?? 0) ? "Consider a suitable protein-rich food within your preferences." : "This recipe combination exceeds that estimate; adjust portions or swap meals to suit your needs."}`,
    );
  if (p.restrictions.trim())
    warnings.push(
      "Free-text exclusions use ingredient-name matching. Review every ingredient before eating.",
    );
  return {
    id: crypto.randomUUID(),
    date,
    meals,
    totals,
    checked: [],
    warnings,
  };
}
export function groceryList(plan: MealPlan) {
  const map = new Map<string, number>();
  for (const meal of plan.meals)
    for (const item of meal.ingredients)
      map.set(item.name, (map.get(item.name) ?? 0) + item.grams);
  return [...map]
    .map(([name, grams]) => ({ name, grams }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
