"use client";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { Profile } from "@/lib/types";
import {
  ArrowRight,
  CalendarDays,
  ShieldCheck,
  Target,
  UserRound,
  Utensils,
} from "lucide-react";
import { useState } from "react";
import {
  Choice,
  Field,
  goalLabel,
  PageTitle,
  Panel,
  Submit,
  useFitness,
} from "./common";
export default function ProfilePage() {
  const { s, act, busy, navigate } = useFitness(),
    [p, setP] = useState<Profile>(s.profile);
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) =>
    setP((x) => ({ ...x, [k]: v }));
  const onboarding = !s.profile.onboarded;
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const r = await act(
      "profile",
      "PUT",
      { ...p, onboarded: true },
      "Your fitness profile is saved.",
    );
    if (r && onboarding) navigate("dashboard");
  }
  const toggle = (k: "equipment" | "allergies", v: string) =>
    set(k, p[k].includes(v) ? p[k].filter((x) => x !== v) : [...p[k], v]);
  return (
    <>
      <PageTitle
        eyebrow={onboarding ? "WELCOME TO YOUR NEXT CHAPTER" : "MADE FOR YOU"}
        title={
          onboarding
            ? "Let’s find your starting point."
            : "Your fitness profile"
        }
        description="A few details help your training, nutrition, and schedule fit your life."
      />
      <form className="profile-form" onSubmit={save}>
        <div className="grid-2">
          <Panel
            title="Your starting point"
            subtitle="Used for estimates, never a diagnosis."
            action={<UserRound size={20} />}
          >
            <div className="form-grid">
              <Field label="Age (years)">
                <Input
                  type="number"
                  min={18}
                  max={90}
                  value={p.age}
                  onChange={(e) => set("age", +e.target.value)}
                  required
                />
              </Field>
              <Field
                label="Equation sex coefficient"
                hint="Optional. Used only to estimate resting energy needs."
              >
                <Choice
                  value={p.sex}
                  onChange={(v) => set("sex", v as Profile["sex"])}
                  options={[
                    { value: "unspecified", label: "Prefer not to specify" },
                    { value: "male", label: "Male" },
                    { value: "female", label: "Female" },
                  ]}
                />
              </Field>
              <Field label="Height (cm)">
                <Input
                  type="number"
                  min={100}
                  max={230}
                  step="0.1"
                  value={p.height}
                  onChange={(e) => set("height", +e.target.value)}
                  required
                />
              </Field>
              <Field label="Weight (kg)">
                <Input
                  type="number"
                  min={30}
                  max={250}
                  step="0.1"
                  value={p.weight}
                  onChange={(e) => set("weight", +e.target.value)}
                  required
                />
              </Field>
            </div>
            <Field label="Usual activity level">
              <Choice
                value={p.activity}
                onChange={(v) => set("activity", v as Profile["activity"])}
                options={[
                  {
                    value: "sedentary",
                    label: "Mostly seated · little exercise",
                  },
                  { value: "light", label: "Light · 1–3 active days a week" },
                  { value: "moderate", label: "Moderate · 3–5 active days" },
                  {
                    value: "active",
                    label: "Active · most days / physical work",
                  },
                ]}
              />
            </Field>
          </Panel>
          <Panel title="Your training" action={<Target size={20} />}>
            <div className="form-grid">
              <Field label="Main goal">
                <Choice
                  value={p.goal}
                  onChange={(v) => set("goal", v as Profile["goal"])}
                  options={["fitness", "strength", "muscle", "fat_loss"].map(
                    (value) => ({ value, label: goalLabel(value) }),
                  )}
                />
              </Field>
              <Field label="Experience">
                <Choice
                  value={p.experience}
                  onChange={(v) =>
                    set("experience", v as Profile["experience"])
                  }
                  options={["beginner", "intermediate", "advanced"].map(
                    (value) => ({
                      value,
                      label: value[0].toUpperCase() + value.slice(1),
                    }),
                  )}
                />
              </Field>
            </div>
            <fieldset>
              <legend>Available equipment</legend>
              <div className="checkbox-options">
                {["bodyweight", "dumbbells", "barbell", "bands"].map((v) => (
                  <label key={v}>
                    <Checkbox
                      checked={p.equipment.includes(v)}
                      onCheckedChange={() => toggle("equipment", v)}
                    />
                    {v[0].toUpperCase() + v.slice(1)}
                  </label>
                ))}
              </div>
            </fieldset>
            <p className="help-box">
              FORM matches plans to your equipment and experience. Camera
              coaching currently supports six selected movements.
            </p>
          </Panel>
          <Panel title="Food that fits you" action={<Utensils size={20} />}>
            <div className="form-grid">
              <Field label="Dietary preference">
                <Choice
                  value={p.diet}
                  onChange={(v) => set("diet", v as Profile["diet"])}
                  options={[
                    { value: "omnivore", label: "No dietary restriction" },
                    {
                      value: "vegetarian",
                      label: "Vegetarian (includes dairy)",
                    },
                    { value: "vegan", label: "Vegan" },
                  ]}
                />
              </Field>
              <Field label="Preferred cuisine">
                <Choice
                  value={p.cuisine}
                  onChange={(v) => set("cuisine", v as Profile["cuisine"])}
                  options={[
                    { value: "any", label: "Any cuisine" },
                    "Indian",
                    "Mediterranean",
                  ]}
                />
              </Field>
              <Field label="Meals per day">
                <Choice
                  value={String(p.meals)}
                  onChange={(v) => set("meals", +v)}
                  options={["2", "3", "4", "5", "6"]}
                />
              </Field>
            </div>
            <fieldset>
              <legend>Food allergies</legend>
              <div className="checkbox-options allergens">
                {[
                  "Milk",
                  "Eggs",
                  "Peanut",
                  "Tree nuts",
                  "Soy",
                  "Wheat",
                  "Fish",
                  "Shellfish",
                  "Sesame",
                ].map((v) => (
                  <label key={v}>
                    <Checkbox
                      checked={p.allergies.includes(v)}
                      onCheckedChange={() => toggle("allergies", v)}
                    />
                    {v}
                  </label>
                ))}
              </div>
            </fieldset>
            <Field
              label="Other ingredients to exclude"
              hint="Separate specific ingredient names with commas. Review every recipe and product label."
            >
              <Input
                value={p.restrictions}
                onChange={(e) => set("restrictions", e.target.value)}
                maxLength={300}
                placeholder="e.g. mushroom, banana"
              />
            </Field>
            <label className="sensitive-choice">
              <Checkbox
                checked={p.sensitive}
                onCheckedChange={(v) => set("sensitive", !!v)}
              />
              <span>
                I need individual clinical nutrition guidance (for example
                pregnancy, an eating disorder history, or a relevant medical
                condition).
                <small>
                  Personal calorie targets and meal generation will be paused.
                </small>
              </span>
            </label>
          </Panel>
          <Panel
            title="Make space in your week"
            action={<CalendarDays size={20} />}
          >
            <fieldset>
              <legend>Preferred training days</legend>
              <div className="day-options">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                  (day, i) => (
                    <label
                      key={day}
                      className={p.days.includes(i) ? "selected" : ""}
                    >
                      <Checkbox
                        checked={p.days.includes(i)}
                        onCheckedChange={() =>
                          set(
                            "days",
                            p.days.includes(i)
                              ? p.days.filter((x) => x !== i)
                              : [...p.days, i],
                          )
                        }
                      />
                      {day}
                    </label>
                  ),
                )}
              </div>
            </fieldset>
            <div className="form-grid">
              <Field label="Preferred workout time">
                <Input
                  type="time"
                  value={p.workoutTime}
                  onChange={(e) => set("workoutTime", e.target.value)}
                  required
                />
              </Field>
              <Field label="Timezone">
                <Choice
                  value={p.timezone}
                  onChange={(v) => set("timezone", v)}
                  options={[
                    { value: "Asia/Kolkata", label: "India (Kolkata)" },
                    { value: "Etc/UTC", label: "UTC" },
                    { value: "Europe/London", label: "London" },
                    { value: "America/New_York", label: "New York" },
                    { value: "America/Los_Angeles", label: "Los Angeles" },
                    ...(![
                      "Asia/Kolkata",
                      "Etc/UTC",
                      "Europe/London",
                      "America/New_York",
                      "America/Los_Angeles",
                    ].includes(p.timezone)
                      ? [p.timezone]
                      : []),
                  ]}
                />
              </Field>
            </div>
            <label className="switch-row">
              <span>
                <strong>In-app reminders</strong>
                <small>
                  Session prompts and motivational nudges in your workspace.
                </small>
              </span>
              <Switch
                checked={p.reminders}
                onCheckedChange={(v) => set("reminders", v)}
              />
            </label>
            <div className="privacy-card">
              <ShieldCheck />
              <div>
                <strong>Only what helps you train.</strong>
                <p>
                  Camera video is never stored. Profile details stay in your
                  account. Export or delete them in Settings.
                </p>
              </div>
            </div>
          </Panel>
        </div>
        <div className="form-footer">
          <p>
            Training preferences update upcoming sessions. Nutrition changes
            clear old meal plans so your current restrictions are respected.
          </p>
          <Submit type="submit" busy={busy}>
            Save {onboarding ? "and continue" : "profile"}
            <ArrowRight size={17} />
          </Submit>
        </div>
      </form>
    </>
  );
}
