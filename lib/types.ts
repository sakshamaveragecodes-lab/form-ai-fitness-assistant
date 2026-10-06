export type ExerciseId =
  | "squat"
  | "pushup"
  | "curl"
  | "press"
  | "lunge"
  | "plank";
export type Profile = {
  age: number;
  sex: "male" | "female" | "unspecified";
  height: number;
  weight: number;
  goal: "strength" | "muscle" | "fat_loss" | "fitness";
  activity: "sedentary" | "light" | "moderate" | "active";
  diet: "omnivore" | "vegetarian" | "vegan";
  allergies: string[];
  restrictions: string;
  cuisine: "any" | "Indian" | "Mediterranean";
  meals: number;
  experience: "beginner" | "intermediate" | "advanced";
  equipment: string[];
  days: number[];
  workoutTime: string;
  timezone: string;
  sensitive: boolean;
  reminders: boolean;
  llmConsent: boolean;
  onboarded: boolean;
};
export const DEFAULT_PROFILE: Profile = {
  age: 25,
  sex: "unspecified",
  height: 170,
  weight: 70,
  goal: "fitness",
  activity: "moderate",
  diet: "vegetarian",
  allergies: [],
  restrictions: "",
  cuisine: "Indian",
  meals: 3,
  experience: "beginner",
  equipment: ["bodyweight"],
  days: [1, 3, 5],
  workoutTime: "18:00",
  timezone: "Asia/Kolkata",
  sensitive: false,
  reminders: true,
  llmConsent: false,
  onboarded: false,
};
export type User = {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  demo: number;
  workspace_id: string;
  status: string;
  created_at: string;
};
export type CatalogKind =
  | "exercises"
  | "plans"
  | "meals"
  | "challenges"
  | "gyms"
  | "content";
export type CatalogItem = {
  id: string;
  kind: CatalogKind;
  name: string;
  description: string;
  data: Record<string, any>;
  active: number;
};
export type Rep = {
  duration: number;
  range: number;
  form: number;
  tempo: number;
};
export type Workout = {
  id: string;
  title: string;
  exercise: ExerciseId;
  reps: number;
  sets: number;
  duration: number;
  resistance: number;
  score: number | null;
  form: number | null;
  rom: number | null;
  tempo: number | null;
  consistency: number | null;
  completion: number | null;
  source: "camera" | "manual" | "replay" | "seed";
  performed_at: string;
  metrics: Rep[];
  notes: string;
  rpe: number;
};
export type Schedule = {
  id: string;
  date: string;
  time: string;
  title: string;
  status: "scheduled" | "completed" | "skipped";
  user_id?: string;
};
export type Nutrition = {
  bmi: number;
  bmr: number;
  bmrRange: number[] | null;
  tdee: number;
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  blocked: boolean;
  note: string;
};
export type NutritionLog = {
  id: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meal: string;
  date: string;
  quantity: number;
};
export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode: string;
  sentiment: string;
  created_at: string;
};
export type Device = {
  id: string;
  name: string;
  exercise: ExerciseId;
  mode: "simulated" | "hardware";
  active: number;
  readings: Reading[];
};
export type Reading = {
  id: string;
  device_id: string;
  sequence: number;
  resistance: number;
  reps: number;
  duration: number;
  rest: number;
  heart_rate: number | null;
  rpe: number;
  form: number;
  created_at: string;
  source: string;
};
export type Notice = {
  id: string;
  title: string;
  body: string;
  kind: string;
  read_at: string | null;
  created_at: string;
};
export type Meal = {
  id: string;
  name: string;
  slot: string;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: { name: string; grams: number }[];
  allergens: string[];
  instructions: string;
};
export type MealPlan = {
  id: string;
  date: string;
  meals: Meal[];
  checked: string[];
  totals: { calories: number; protein: number; fat: number; carbs: number };
  warnings: string[];
};
export type Snapshot = {
  user: User;
  profile: Profile;
  nutrition: Nutrition;
  workouts: Workout[];
  schedule: Schedule[];
  logs: NutritionLog[];
  catalog: Record<CatalogKind, CatalogItem[]>;
  notifications: Notice[];
  devices: Device[];
  messages: ChatMessage[];
  plan: MealPlan | null;
  habits: {
    consistency: number;
    streak: number;
    risk: number;
    label: string;
    reasons: string[];
    due: number;
    done: number;
    daysSince: number | null;
    preferredTime: string;
    coldStart: boolean;
  };
  joined: string[];
  today: string;
  providerAvailable: boolean;
};
