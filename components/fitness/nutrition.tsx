"use client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { groceryList } from "@/lib/algorithms/nutrition";
import { download } from "@/lib/api";
import type { Meal } from "@/lib/types";
import {
  ArrowRight,
  ChefHat,
  Download,
  Flame,
  Plus,
  RefreshCw,
  Trash2,
  Utensils,
} from "lucide-react";
import { useState } from "react";
import {
  Badge,
  Choice,
  Confirm,
  Empty,
  Field,
  fmt,
  Macro,
  Metric,
  PageTitle,
  Panel,
  Ring,
  Submit,
  useFitness,
} from "./common";
export default function Nutrition() {
  const { s, act, busy, navigate } = useFitness();
  const [open, setOpen] = useState(false),
    [recipe, setRecipe] = useState<Meal | null>(null),
    [variation, setVariation] = useState(0),
    [remove, setRemove] = useState("");
  const [food, setFood] = useState({
    food_name: "",
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    meal: "Breakfast",
    quantity: 1,
    date: s.today,
  });
  const logs = s.logs.filter((x) => x.date === s.today);
  const totals = logs.reduce(
    (a, x) => ({
      calories: a.calories + x.calories,
      protein: a.protein + x.protein,
      carbs: a.carbs + x.carbs,
      fat: a.fat + x.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  const grocery = s.plan ? groceryList(s.plan) : [];
  async function generate() {
    const r = await act(
      "nutrition/plan",
      "POST",
      { variation },
      "Your meal plan is ready.",
    );
    if (r) setVariation(variation + 1);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const r = await act(
      "nutrition/logs",
      "POST",
      food,
      "Meal added to your food diary.",
    );
    if (r) setOpen(false);
  }
  function choose(id: string) {
    const m = s.catalog.meals.find((x) => x.id === id);
    if (m)
      setFood({
        ...food,
        food_name: m.name,
        calories: m.data.calories,
        protein: m.data.protein,
        carbs: m.data.carbs,
        fat: m.data.fat,
        meal: m.data.slot,
        quantity: 1,
      });
  }
  function logPlan(m: Meal) {
    setFood({
      food_name: m.name,
      calories: m.calories,
      protein: m.protein,
      carbs: m.carbs,
      fat: m.fat,
      meal: m.slot,
      quantity: m.servings,
      date: s.today,
    });
    setOpen(true);
  }
  return (
    <>
      <PageTitle
        eyebrow="FUEL YOUR EVERYDAY"
        title="A little more nourished."
        description="Simple plans, a clearer food diary, and room for your preferences."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus size={17} />
            Log food
          </Button>
        }
      />
      <div className="nutrition-overview">
        <Panel className="nutrition-energy">
          <div>
            <span className="eyebrow">TODAY’S ENERGY</span>
            <h2>
              {fmt(totals.calories)}
              <small>
                {" "}
                / {s.nutrition.calories ? fmt(s.nutrition.calories) : "—"} kcal
              </small>
            </h2>
            <p className="muted">
              {s.nutrition.calories
                ? `${fmt(Math.max(0, s.nutrition.calories - totals.calories))} kcal to your estimated target`
                : "Personal targets are paused"}
            </p>
          </div>
          <Ring
            value={totals.calories}
            max={s.nutrition.calories ?? 2000}
            label={
              s.nutrition.calories
                ? `${Math.round((totals.calories / s.nutrition.calories) * 100)}%`
                : "—"
            }
            size={102}
            color="#9fbf5a"
          />
        </Panel>
        <Panel className="nutrition-macros">
          <Macro
            label="Protein"
            value={totals.protein}
            target={s.nutrition.protein}
          />
          <Macro
            label="Carbs"
            value={totals.carbs}
            target={s.nutrition.carbs}
            color="lavender"
          />
          <Macro
            label="Fats"
            value={totals.fat}
            target={s.nutrition.fat}
            color="peach"
          />
        </Panel>
      </div>
      <div className="nutrition-profile-strip">
        <Badge tone="mint">{s.profile.diet}</Badge>
        <span>
          {s.profile.cuisine === "any"
            ? "All cuisines"
            : s.profile.cuisine + " inspired"}{" "}
          · {s.profile.meals} meals / day
        </span>
        <span>
          Allergens excluded:{" "}
          {s.profile.allergies.join(", ") || "None selected"}
        </span>
        <button className="text-link" onClick={() => navigate("profile")}>
          Edit preferences
          <ArrowRight size={15} />
        </button>
      </div>
      {s.nutrition.blocked && (
        <div className="warning-box">
          {s.nutrition.note} You can still keep a food diary.
        </div>
      )}
      <Tabs defaultValue="plan">
        <TabsList className="section-tabs">
          <TabsTrigger value="plan">Meal planner</TabsTrigger>
          <TabsTrigger value="diary">Food diary</TabsTrigger>
          <TabsTrigger value="grocery">Grocery list</TabsTrigger>
          <TabsTrigger value="estimates">Your estimates</TabsTrigger>
        </TabsList>
        <TabsContent value="plan">
          <div className="section-heading">
            <div>
              <h2>Good food. Less guesswork.</h2>
              <p className="muted">
                Portions are scaled toward your daily energy estimate.
              </p>
            </div>
            <Submit
              busy={busy}
              disabled={s.nutrition.blocked}
              onClick={generate}
            >
              <RefreshCw size={16} />
              {s.plan ? "Refresh meal plan" : "Generate my meal plan"}
            </Submit>
          </div>
          {s.plan ? (
            <>
              <div className="grid-3 meal-grid">
                {s.plan.meals.map((m, i) => (
                  <article className="meal-card" key={m.slot + i}>
                    <div className={`meal-heading cover-${i % 3}`}>
                      <span className="meal-slot">
                        <Utensils size={17} />
                        {m.slot}
                      </span>
                      <ChefHat size={38} strokeWidth={1.3} />
                      <span className="meal-kcal">
                        {m.calories}
                        <small>kcal</small>
                      </span>
                    </div>
                    <div className="meal-body">
                      <h3>{m.name}</h3>
                      <p>{m.servings} recipe servings</p>
                      <div className="meal-macros">
                        <span>
                          <strong>{m.protein}g</strong>Protein
                        </span>
                        <span>
                          <strong>{m.carbs}g</strong>Carbs
                        </span>
                        <span>
                          <strong>{m.fat}g</strong>Fat
                        </span>
                      </div>
                      <p className="allergen-note">
                        Contains:{" "}
                        {m.allergens.length
                          ? m.allergens.join(", ")
                          : "no selected major allergens in the recipe"}
                      </p>
                      <div className="button-row">
                        <Button variant="outline" onClick={() => setRecipe(m)}>
                          View recipe
                        </Button>
                        <Button onClick={() => logPlan(m)}>
                          <Plus size={15} />
                          Log meal
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              <div className="plan-total">
                <span>Planned total</span>
                <strong>{fmt(s.plan.totals.calories)} kcal</strong>
                <span>
                  {s.plan.totals.protein} g protein · {s.plan.totals.carbs} g
                  carbs · {s.plan.totals.fat} g fat
                </span>
              </div>
              {s.plan.warnings.map((w) => (
                <p className="quiet-note" key={w}>
                  {w}
                </p>
              ))}
            </>
          ) : (
            <Panel>
              <Empty
                title="A plan built around your preferences"
                body="Generate your meals to see recipes, portion estimates, and a combined grocery list."
                action={
                  <Button
                    disabled={busy || s.nutrition.blocked}
                    onClick={generate}
                  >
                    Generate meal plan
                  </Button>
                }
              />
            </Panel>
          )}
        </TabsContent>
        <TabsContent value="diary">
          <Panel
            title="Today’s food diary"
            subtitle="Nutrition values are totals for the portion you logged."
          >
            {logs.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Food</TableHead>
                    <TableHead>Meal</TableHead>
                    <TableHead>Energy</TableHead>
                    <TableHead>Protein</TableHead>
                    <TableHead>Carbs / fat</TableHead>
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>
                        <strong>{l.food_name}</strong>
                        <p className="small muted">{l.quantity} serving(s)</p>
                      </TableCell>
                      <TableCell>{l.meal}</TableCell>
                      <TableCell>{l.calories} kcal</TableCell>
                      <TableCell>{l.protein} g</TableCell>
                      <TableCell>
                        {l.carbs} g / {l.fat} g
                      </TableCell>
                      <TableCell>
                        <button
                          className="icon-button"
                          aria-label={`Delete ${l.food_name}`}
                          onClick={() => setRemove(l.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Empty
                title="Make your first entry"
                body="Log a meal from your plan, or enter the numbers from a food label."
                action={<Button onClick={() => setOpen(true)}>Log food</Button>}
              />
            )}
          </Panel>
          <Panel
            title="Recent days"
            subtitle="Stored food logs from the last 30 days."
          >
            <div className="recent-food-days">
              {[...new Set(s.logs.map((x) => x.date))]
                .filter((d) => d !== s.today)
                .slice(0, 7)
                .map((d) => (
                  <div key={d}>
                    <strong>{d}</strong>
                    <span>
                      {Math.round(
                        s.logs
                          .filter((x) => x.date === d)
                          .reduce((n, x) => n + x.calories, 0),
                      )}{" "}
                      kcal
                    </span>
                    <span>
                      {s.logs.filter((x) => x.date === d).length} entries
                    </span>
                  </div>
                ))}
              {!s.logs.some((x) => x.date !== s.today) && (
                <p className="muted">
                  Your earlier entries will appear here as you build your diary.
                </p>
              )}
            </div>
          </Panel>
        </TabsContent>
        <TabsContent value="grocery">
          <Panel
            title="One list. Everything you need."
            subtitle="Combined ingredients for today’s plan. Weights follow each recipe’s cooked/raw labels."
            action={
              <Button
                variant="outline"
                disabled={!grocery.length}
                onClick={() =>
                  download(
                    "FORM-grocery-list.txt",
                    `FORM grocery list · ${s.today}\n\n${grocery.map((g) => `${s.plan?.checked.includes(g.name) ? "[x]" : "[ ]"} ${g.name}: ${g.grams} g`).join("\n")}`,
                    "text/plain",
                  )
                }
              >
                <Download size={16} />
                Download list
              </Button>
            }
          >
            {grocery.length ? (
              <div className="grocery-list">
                {grocery.map((g) => (
                  <label
                    key={g.name}
                    className={
                      s.plan?.checked.includes(g.name) ? "checked" : ""
                    }
                  >
                    <Checkbox
                      checked={s.plan?.checked.includes(g.name)}
                      disabled={busy}
                      onCheckedChange={(checked) => {
                        const current = s.plan?.checked ?? [];
                        void act("nutrition/grocery", "PUT", {
                          checked: checked
                            ? [...current, g.name]
                            : current.filter((x) => x !== g.name),
                        });
                      }}
                    />
                    <span>{g.name}</span>
                    <strong>{g.grams} g</strong>
                  </label>
                ))}
              </div>
            ) : (
              <Empty
                title="Your shopping list is waiting"
                body="Generate a meal plan first. Its ingredients will appear here automatically."
              />
            )}
          </Panel>
        </TabsContent>
        <TabsContent value="estimates">
          <div className="grid-3">
            <Metric
              icon={Utensils}
              label="BMI"
              value={s.nutrition.bmi}
              detail="Weight / height² · a screening estimate"
            />
            <Metric
              icon={Flame}
              label="Resting energy (BMR)"
              value={fmt(s.nutrition.bmr)}
              unit="kcal"
              detail="Mifflin–St Jeor equation"
              color="peach"
            />
            <Metric
              icon={Flame}
              label="Daily energy (TDEE)"
              value={fmt(s.nutrition.tdee)}
              unit="kcal"
              detail="BMR × your selected activity factor"
              color="lavender"
            />
          </div>
          <Panel title="Know what goes into your numbers">
            <p>{s.nutrition.note}</p>
            {s.nutrition.bmrRange && (
              <p>
                Your equation range is {s.nutrition.bmrRange.join("–")}{" "}
                kcal/day. The displayed estimate uses its midpoint.
              </p>
            )}
            <div className="prose">
              <p>
                <strong>BMR:</strong> 10 × weight (kg) + 6.25 × height (cm) − 5
                × age, plus 5 for the male coefficient or minus 161 for the
                female coefficient.
              </p>
              <p>
                <strong>Goals:</strong> A modest deficit of at most 350 kcal or
                15% of TDEE for fat loss, or a surplus of at most 250 kcal or
                10% for muscle gain. Targets never fall below the estimated BMR.
              </p>
              <p>
                <strong>Macros:</strong> Protein starts at 1.6 g/kg. Fat is
                approximately 30% of calories; carbohydrate receives the
                remainder. These defaults are not suitable for every individual.
              </p>
              <p>
                BMI does not measure body fat or diagnose health. Meal values
                are recipe estimates; actual products and preparation change
                nutrition.
              </p>
            </div>
          </Panel>
        </TabsContent>
      </Tabs>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="wide-dialog">
          <DialogHeader>
            <DialogTitle>Add to your food diary</DialogTitle>
            <DialogDescription>
              Enter nutrition for the entire portion you ate. Serving count is a
              label; values below are not multiplied again.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save}>
            <Field label="Start from a recipe (optional)">
              <Choice
                value="choose"
                onChange={choose}
                options={[
                  { value: "choose", label: "Choose a recipe…" },
                  ...s.catalog.meals.map((m) => ({
                    value: m.id,
                    label: m.name,
                  })),
                ]}
              />
            </Field>
            <Field label="Food / meal name">
              <Input
                required
                minLength={2}
                maxLength={100}
                value={food.food_name}
                onChange={(e) =>
                  setFood({ ...food, food_name: e.target.value })
                }
              />
            </Field>
            <div className="form-grid">
              {[
                ["calories", "Energy (kcal)", 5000],
                ["protein", "Protein (g)", 300],
                ["carbs", "Carbs (g)", 800],
                ["fat", "Fat (g)", 300],
                ["quantity", "Servings eaten", 10],
              ].map(([k, label, max]) => (
                <Field key={k} label={String(label)}>
                  <Input
                    type="number"
                    min={k === "quantity" ? 0.1 : 0}
                    step="0.1"
                    max={Number(max)}
                    required
                    value={food[k as keyof typeof food]}
                    onChange={(e) => setFood({ ...food, [k]: +e.target.value })}
                  />
                </Field>
              ))}
              <Field label="Meal">
                <Choice
                  value={food.meal}
                  onChange={(meal) => setFood({ ...food, meal })}
                  options={["Breakfast", "Lunch", "Dinner", "Snack"]}
                />
              </Field>
              <Field label="Date">
                <Input
                  type="date"
                  max={s.today}
                  value={food.date}
                  onChange={(e) => setFood({ ...food, date: e.target.value })}
                  required
                />
              </Field>
            </div>
            <Submit type="submit" busy={busy} className="full-width">
              Save food entry
            </Submit>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!recipe} onOpenChange={(open) => !open && setRecipe(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{recipe?.name}</DialogTitle>
            <DialogDescription>
              {recipe?.servings} servings · {recipe?.calories} estimated kcal
            </DialogDescription>
          </DialogHeader>
          <ul className="ingredient-list">
            {recipe?.ingredients.map((i) => (
              <li key={i.name}>
                <span>{i.name}</span>
                <strong>{i.grams} g</strong>
              </li>
            ))}
          </ul>
          <p>{recipe?.instructions}</p>
          <p className="small muted">
            Check ingredient labels for allergens and prepare foods safely.
          </p>
        </DialogContent>
      </Dialog>
      <Confirm
        open={!!remove}
        onOpenChange={(v) => !v && setRemove("")}
        title="Delete this food entry?"
        description="It will be removed from your nutrition totals."
        onConfirm={() => {
          void act(
            "nutrition/logs/" + remove,
            "DELETE",
            undefined,
            "Food entry deleted.",
          );
          setRemove("");
        }}
      />
    </>
  );
}
