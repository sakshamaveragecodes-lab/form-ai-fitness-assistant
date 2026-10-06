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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CATALOG } from "@/lib/catalog";
import type { CatalogItem, CatalogKind } from "@/lib/types";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Choice, Field, Submit, useFitness } from "./common";
export default function CatalogEditor({
  item,
  kind,
  onClose,
}: {
  item: CatalogItem | null;
  kind: CatalogKind;
  onClose: () => void;
}) {
  const { act, busy } = useFitness();
  const starter = CATALOG.find((x) => x.kind === kind)!;
  const [name, setName] = useState(item?.name ?? ""),
    [description, setDescription] = useState(item?.description ?? ""),
    [data, setData] = useState<Record<string, any>>(
      structuredClone(item?.data ?? starter.data),
    ),
    [active, setActive] = useState(item?.active ?? 1);
  const set = (k: string, v: any) => setData((d) => ({ ...d, [k]: v }));
  const text = (k: string, label: string, multiline = false) => (
    <Field key={k} label={label}>
      {multiline ? (
        <Textarea
          value={Array.isArray(data[k]) ? data[k].join("\n") : data[k]}
          onChange={(e) =>
            set(
              k,
              Array.isArray(data[k])
                ? e.target.value.split("\n").filter(Boolean)
                : e.target.value,
            )
          }
          maxLength={2000}
          required
        />
      ) : (
        <Input
          value={data[k]}
          onChange={(e) => set(k, e.target.value)}
          maxLength={200}
          required
        />
      )}
    </Field>
  );
  const number = (
    k: string,
    label: string,
    min: number,
    max: number,
    step = 1,
  ) => (
    <Field key={k} label={label}>
      <Input
        type="number"
        value={data[k]}
        onChange={(e) => set(k, +e.target.value)}
        min={min}
        max={max}
        step={step}
        required
      />
    </Field>
  );
  const choice = (k: string, label: string, options: string[]) => (
    <Field key={k} label={label}>
      <Choice value={data[k]} onChange={(v) => set(k, v)} options={options} />
    </Field>
  );
  const multi = (k: string, label: string, options: string[]) => (
    <fieldset key={k}>
      <legend>{label}</legend>
      <div className="checkbox-options">
        {options.map((v) => (
          <label key={v}>
            <Checkbox
              checked={(data[k] ?? []).includes(v)}
              onCheckedChange={(checked) =>
                set(
                  k,
                  checked
                    ? [...(data[k] ?? []), v]
                    : (data[k] ?? []).filter((x: string) => x !== v),
                )
              }
            />
            {v}
          </label>
        ))}
      </div>
    </fieldset>
  );
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const r = await act(
      "admin/catalog" + (item ? "/" + item.id : ""),
      item ? "PUT" : "POST",
      { kind, name, description, data, active },
      item ? "Content updated." : "Content created.",
    );
    if (r) onClose();
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="wide-dialog">
        <DialogHeader>
          <DialogTitle>
            {item ? "Edit" : "Add"} {kind.replace(/s$/, "")}
          </DialogTitle>
          <DialogDescription>
            Changes apply only to this workspace. Archived records remain
            available in historical logs.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={save}>
          <Field label="Name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              minLength={2}
              maxLength={100}
              required
            />
          </Field>
          <Field label="Description">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
            />
          </Field>
          {kind === "exercises" && (
            <>
              {choice("slug", "Supported movement", [
                "squat",
                "pushup",
                "curl",
                "press",
                "lunge",
                "plank",
              ])}
              {text("muscle", "Muscle group")}
              {choice("level", "Experience", [
                "beginner",
                "intermediate",
                "advanced",
              ])}
              {multi("equipment", "Equipment", [
                "bodyweight",
                "dumbbells",
                "barbell",
                "bands",
              ])}
              <div className="form-grid">
                {number("sets", "Default sets", 1, 10)}
                {number("reps", "Repetitions / hold seconds", 1, 120)}
              </div>
              {text("cues", "Coaching cues (one per line)", true)}
              {text("camera", "Camera positioning")}
            </>
          )}
          {kind === "plans" && (
            <>
              {choice("level", "Experience", [
                "beginner",
                "intermediate",
                "advanced",
                "all",
              ])}
              {multi("goals", "Goals", [
                "fitness",
                "strength",
                "muscle",
                "fat_loss",
              ])}
              {multi("equipment", "Equipment", [
                "bodyweight",
                "dumbbells",
                "barbell",
                "bands",
              ])}
              {multi("exercises", "Movement sequence", [
                "squat",
                "pushup",
                "curl",
                "press",
                "lunge",
                "plank",
              ])}
              <div className="form-grid">
                {number("days", "Days per week", 1, 6)}
                {number("minutes", "Session minutes", 5, 120)}
                {number("sets", "Sets per movement", 1, 10)}
                {number("reps", "Repetitions per set", 1, 120)}
              </div>
            </>
          )}
          {kind === "meals" && (
            <>
              <div className="form-grid">
                {choice("slot", "Meal", [
                  "Breakfast",
                  "Lunch",
                  "Dinner",
                  "Snack",
                ])}
                {choice("diet", "Diet", ["omnivore", "vegetarian", "vegan"])}
                {choice("cuisine", "Cuisine", ["Indian", "Mediterranean"])}
                {number("calories", "Calories per serving", 50, 2000)}
                {number("protein", "Protein (g)", 0, 200, 0.1)}
                {number("carbs", "Carbohydrates (g)", 0, 300, 0.1)}
                {number("fat", "Fat (g)", 0, 150, 0.1)}
              </div>
              {multi("allergens", "Allergens present", [
                "Milk",
                "Eggs",
                "Peanut",
                "Tree nuts",
                "Soy",
                "Wheat",
                "Fish",
                "Shellfish",
                "Sesame",
              ])}
              <fieldset>
                <legend>Ingredients per serving</legend>
                {data.ingredients.map((g: any, i: number) => (
                  <div className="ingredient-editor" key={i}>
                    <Input
                      aria-label={`Ingredient ${i + 1} name`}
                      value={g.name}
                      onChange={(e) =>
                        set(
                          "ingredients",
                          data.ingredients.map((x: any, j: number) =>
                            i === j ? { ...x, name: e.target.value } : x,
                          ),
                        )
                      }
                      minLength={2}
                      maxLength={100}
                      required
                    />
                    <Input
                      aria-label={`Ingredient ${i + 1} grams`}
                      type="number"
                      min={1}
                      max={2000}
                      value={g.grams}
                      onChange={(e) =>
                        set(
                          "ingredients",
                          data.ingredients.map((x: any, j: number) =>
                            i === j ? { ...x, grams: +e.target.value } : x,
                          ),
                        )
                      }
                      required
                    />
                    <span>g</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ingredient ${i + 1}`}
                      disabled={data.ingredients.length <= 1}
                      onClick={() =>
                        set(
                          "ingredients",
                          data.ingredients.filter(
                            (_: any, j: number) => j !== i,
                          ),
                        )
                      }
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  disabled={data.ingredients.length >= 20}
                  onClick={() =>
                    set("ingredients", [
                      ...data.ingredients,
                      { name: "", grams: 100 },
                    ])
                  }
                >
                  <Plus size={15} />
                  Add ingredient
                </Button>
              </fieldset>
              {text("instructions", "Preparation instructions", true)}
              {text("source", "Nutrition source / estimate note")}
            </>
          )}
          {kind === "challenges" && (
            <>
              <div className="form-grid">
                {number("target", "Target", 1, 1000)}
                {number("days", "Rolling window (days)", 1, 90)}
              </div>
              {choice("metric", "Measurement", [
                "sessions",
                "minutes",
                "camera",
              ])}
              {text("reward", "Achievement label")}
            </>
          )}
          {kind === "gyms" && (
            <>
              {text("address", "Address")}
              <div className="form-grid">
                {number("lat", "Latitude", -90, 90, 0.0001)}
                {number("lng", "Longitude", -180, 180, 0.0001)}
                {number("price", "Monthly fee estimate (₹)", 0, 100000)}
              </div>
              {multi("equipment", "Available equipment", [
                "bodyweight",
                "dumbbells",
                "barbell",
                "bands",
              ])}
              <label className="switch-row">
                <span>Illustrative demo listing</span>
                <Switch
                  checked={data.demo}
                  onCheckedChange={(v) => set("demo", v)}
                />
              </label>
            </>
          )}
          {kind === "content" &&
            choice("category", "Category", [
              "motivation",
              "recovery",
              "nutrition",
              "training",
            ])}
          <label className="switch-row">
            <span>Active in the workspace</span>
            <Switch
              checked={!!active}
              onCheckedChange={(v) => setActive(v ? 1 : 0)}
            />
          </label>
          <Submit type="submit" busy={busy} className="full-width">
            Save {kind.replace(/s$/, "")}
          </Submit>
        </form>
      </DialogContent>
    </Dialog>
  );
}
