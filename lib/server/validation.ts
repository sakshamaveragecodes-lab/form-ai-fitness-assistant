import { z } from "zod";
import { ApiError } from "./db";
export const exerciseEnum = z.enum([
  "squat",
  "pushup",
  "curl",
  "press",
  "lunge",
  "plank",
]);
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (x) =>
      !Number.isNaN(Date.parse(x)) &&
      new Date(x).toISOString().slice(0, 10) === x,
    "Use a valid date",
  );
export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters")
  .max(128);
export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const profileSchema = z
  .object({
    age: z.number().int().min(18).max(90),
    sex: z.enum(["male", "female", "unspecified"]),
    height: z.number().min(100).max(230),
    weight: z.number().min(30).max(250),
    goal: z.enum(["strength", "muscle", "fat_loss", "fitness"]),
    activity: z.enum(["sedentary", "light", "moderate", "active"]),
    diet: z.enum(["omnivore", "vegetarian", "vegan"]),
    allergies: z
      .array(
        z.enum([
          "Milk",
          "Eggs",
          "Peanut",
          "Tree nuts",
          "Soy",
          "Wheat",
          "Fish",
          "Shellfish",
          "Sesame",
        ]),
      )
      .max(9),
    restrictions: z.string().max(300),
    cuisine: z.enum(["any", "Indian", "Mediterranean"]),
    meals: z.number().int().min(2).max(6),
    experience: z.enum(["beginner", "intermediate", "advanced"]),
    equipment: z
      .array(z.enum(["bodyweight", "dumbbells", "barbell", "bands"]))
      .min(1)
      .max(4),
    days: z
      .array(z.number().int().min(0).max(6))
      .min(1)
      .max(6)
      .refine((a) => new Set(a).size === a.length),
    workoutTime: timeSchema,
    timezone: z
      .string()
      .max(64)
      .refine((x) => {
        try {
          new Intl.DateTimeFormat("en", { timeZone: x });
          return true;
        } catch {
          return false;
        }
      }, "Invalid timezone"),
    sensitive: z.boolean(),
    reminders: z.boolean(),
    llmConsent: z.boolean(),
    onboarded: z.boolean(),
  })
  .strict();
export const repSchema = z.object({
  duration: z.number().min(0.5).max(120),
  range: z.number().min(0).max(100),
  form: z.number().min(0).max(100),
  tempo: z.number().min(0).max(100),
});
export const workoutSchema = z
  .object({
    title: z.string().trim().min(2).max(80),
    exercise: exerciseEnum,
    reps: z.number().int().min(0).max(1000),
    sets: z.number().int().min(1).max(30),
    duration: z.number().min(1).max(14400),
    resistance: z.number().min(0).max(500),
    rpe: z.number().min(1).max(10),
    source: z.enum(["manual", "camera", "replay"]),
    metrics: z.array(repSchema).max(1000),
    target: z.number().int().min(1).max(1000),
    notes: z.string().max(500).default(""),
  })
  .strict()
  .refine(
    (x) =>
      x.source === "manual" ||
      x.exercise === "plank" ||
      x.metrics.length === x.reps,
    "Repetition metrics must match repetitions",
  );
export const foodSchema = z
  .object({
    food_name: z.string().trim().min(2).max(100),
    calories: z.number().min(0).max(5000),
    protein: z.number().min(0).max(300),
    carbs: z.number().min(0).max(800),
    fat: z.number().min(0).max(300),
    meal: z.enum(["Breakfast", "Lunch", "Dinner", "Snack"]),
    quantity: z.number().min(0.1).max(10),
    date: dateSchema,
  })
  .strict();
export const readingSchema = z
  .object({
    simulated: z.boolean().default(false),
    sequence: z.number().int().min(0).max(2147483647),
    resistance: z.number().min(0).max(500),
    reps: z.number().int().min(0).max(200),
    duration: z.number().min(0).max(7200),
    rest: z.number().min(0).max(1800),
    heart_rate: z.number().int().min(30).max(240).nullable(),
    rpe: z.number().min(1).max(10),
    form: z.number().min(0).max(100),
  })
  .strict();
export async function body<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  const raw = await req.text();
  if (raw.length > 100000) throw new ApiError(413, "Request is too large.");
  return schema.parse(JSON.parse(raw));
}
export const catalogSchema = z
  .object({
    kind: z.enum([
      "exercises",
      "plans",
      "meals",
      "challenges",
      "gyms",
      "content",
    ]),
    name: z.string().trim().min(2).max(100),
    description: z.string().max(500),
    data: z.record(z.unknown()),
    active: z.number().int().min(0).max(1),
  })
  .strict();
const strings = z.array(z.string().min(1).max(100)).max(20);
export const catalogDataSchemas = {
  exercises: z.object({
    slug: exerciseEnum,
    muscle: z.string().max(60),
    equipment: strings,
    level: z.enum(["beginner", "intermediate", "advanced"]),
    cues: strings.min(1),
    camera: z.string().max(200),
    sets: z.number().int().min(1).max(10),
    reps: z.number().int().min(1).max(120),
  }),
  plans: z.object({
    goals: strings,
    level: z.enum(["beginner", "intermediate", "advanced", "all"]),
    equipment: strings,
    days: z.number().int().min(1).max(6),
    minutes: z.number().min(5).max(120),
    exercises: z.array(exerciseEnum).min(1).max(12),
    sets: z.number().int().min(1).max(10),
    reps: z.number().int().min(1).max(120),
  }),
  meals: z.object({
    slot: z.enum(["Breakfast", "Lunch", "Dinner", "Snack"]),
    diet: z.enum(["omnivore", "vegetarian", "vegan"]),
    cuisine: z.enum(["Indian", "Mediterranean"]),
    calories: z.number().min(50).max(2000),
    protein: z.number().min(0).max(200),
    carbs: z.number().min(0).max(300),
    fat: z.number().min(0).max(150),
    allergens: z
      .array(
        z.enum([
          "Milk",
          "Eggs",
          "Peanut",
          "Tree nuts",
          "Soy",
          "Wheat",
          "Fish",
          "Shellfish",
          "Sesame",
        ]),
      )
      .max(9),
    ingredients: z
      .array(
        z.object({
          name: z.string().min(2).max(100),
          grams: z.number().min(1).max(2000),
        }),
      )
      .min(1)
      .max(20),
    instructions: z.string().min(10).max(2000),
    source: z.string().max(200),
  }),
  challenges: z.object({
    target: z.number().min(1).max(1000),
    days: z.number().int().min(1).max(90),
    metric: z.enum(["sessions", "minutes", "camera"]),
    reward: z.string().max(100),
  }),
  gyms: z.object({
    address: z.string().max(200),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    equipment: strings,
    price: z.number().min(0).max(100000),
    demo: z.boolean(),
  }),
  content: z.object({
    category: z.enum(["motivation", "recovery", "nutrition", "training"]),
  }),
};
