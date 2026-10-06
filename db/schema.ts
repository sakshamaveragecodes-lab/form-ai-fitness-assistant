import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/sqlite-core";
export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  created_at: text("created_at").notNull(),
});
export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    workspace_id: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    password_hash: text("password_hash").notNull(),
    recovery_hash: text("recovery_hash").notNull(),
    role: text("role").notNull().default("user"),
    status: text("status").notNull().default("active"),
    demo: integer("demo").notNull().default(0),
    created_at: text("created_at").notNull(),
  },
  (t) => [
    check("users_role", sql`${t.role} IN ('user','admin')`),
    check("users_status", sql`${t.status} IN ('active','suspended')`),
    index("users_workspace").on(t.workspace_id),
  ],
);
export const sessions = sqliteTable(
  "sessions",
  {
    token_hash: text("token_hash").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires_at: integer("expires_at").notNull(),
    created_at: text("created_at").notNull(),
  },
  (t) => [index("sessions_user").on(t.user_id)],
);
export const profiles = sqliteTable("profiles", {
  user_id: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  data: text("data").notNull(),
  updated_at: text("updated_at").notNull(),
});
export const catalog = sqliteTable(
  "catalog",
  {
    id: text("id").primaryKey(),
    workspace_id: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    data: text("data").notNull(),
    active: integer("active").notNull().default(1),
    updated_at: text("updated_at").notNull(),
  },
  (t) => [index("catalog_workspace_kind").on(t.workspace_id, t.kind)],
);
export const workouts = sqliteTable(
  "workouts",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    exercise: text("exercise").notNull(),
    reps: integer("reps").notNull(),
    sets: integer("sets").notNull(),
    duration: real("duration").notNull(),
    resistance: real("resistance").notNull(),
    rpe: real("rpe").notNull(),
    score: real("score"),
    form: real("form"),
    rom: real("rom"),
    tempo: real("tempo"),
    consistency: real("consistency"),
    completion: real("completion"),
    source: text("source").notNull(),
    metrics: text("metrics").notNull(),
    notes: text("notes").notNull(),
    performed_at: text("performed_at").notNull(),
  },
  (t) => [
    index("workouts_user_date").on(t.user_id, t.performed_at),
    check(
      "workouts_nonnegative",
      sql`${t.reps} >= 0 AND ${t.duration} > 0 AND ${t.sets} > 0`,
    ),
  ],
);
export const schedule = sqliteTable(
  "schedule",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    time: text("time").notNull(),
    title: text("title").notNull(),
    status: text("status").notNull().default("scheduled"),
  },
  (t) => [
    uniqueIndex("schedule_user_date").on(t.user_id, t.date),
    check(
      "schedule_status",
      sql`${t.status} IN ('scheduled','completed','skipped')`,
    ),
  ],
);
export const nutritionLogs = sqliteTable(
  "nutrition_logs",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    food_name: text("food_name").notNull(),
    calories: real("calories").notNull(),
    protein: real("protein").notNull(),
    carbs: real("carbs").notNull(),
    fat: real("fat").notNull(),
    meal: text("meal").notNull(),
    quantity: real("quantity").notNull(),
    date: text("date").notNull(),
  },
  (t) => [
    index("nutrition_user_date").on(t.user_id, t.date),
    check(
      "nutrition_nonnegative",
      sql`${t.calories} >= 0 AND ${t.protein} >= 0 AND ${t.carbs} >= 0 AND ${t.fat} >= 0`,
    ),
  ],
);
export const dietPlans = sqliteTable(
  "diet_plans",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    data: text("data").notNull(),
  },
  (t) => [uniqueIndex("diet_user_date").on(t.user_id, t.date)],
);
export const chatSessions = sqliteTable(
  "chat_sessions",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    created_at: text("created_at").notNull(),
  },
  (t) => [index("chat_sessions_user").on(t.user_id)],
);
export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    session_id: text("session_id")
      .notNull()
      .references(() => chatSessions.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    mode: text("mode").notNull(),
    sentiment: text("sentiment").notNull(),
    created_at: text("created_at").notNull(),
  },
  (t) => [index("messages_session_date").on(t.session_id, t.created_at)],
);
export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    kind: text("kind").notNull(),
    read_at: text("read_at"),
    created_at: text("created_at").notNull(),
  },
  (t) => [index("notices_user_date").on(t.user_id, t.created_at)],
);
export const devices = sqliteTable(
  "devices",
  {
    id: text("id").primaryKey(),
    workspace_id: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    exercise: text("exercise").notNull(),
    mode: text("mode").notNull(),
    token_hash: text("token_hash"),
    active: integer("active").notNull().default(1),
    created_at: text("created_at").notNull(),
  },
  (t) => [index("devices_user").on(t.user_id)],
);
export const readings = sqliteTable(
  "readings",
  {
    id: text("id").primaryKey(),
    device_id: text("device_id")
      .notNull()
      .references(() => devices.id, { onDelete: "cascade" }),
    sequence: integer("sequence").notNull(),
    resistance: real("resistance").notNull(),
    reps: integer("reps").notNull(),
    duration: real("duration").notNull(),
    rest: real("rest").notNull(),
    heart_rate: integer("heart_rate"),
    rpe: real("rpe").notNull(),
    form: real("form").notNull(),
    source: text("source").notNull(),
    created_at: text("created_at").notNull(),
  },
  (t) => [uniqueIndex("readings_device_sequence").on(t.device_id, t.sequence)],
);
export const challengeJoins = sqliteTable(
  "challenge_joins",
  {
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    catalog_id: text("catalog_id")
      .notNull()
      .references(() => catalog.id, { onDelete: "cascade" }),
    created_at: text("created_at").notNull(),
  },
  (t) => [uniqueIndex("challenge_user").on(t.user_id, t.catalog_id)],
);
export const issues = sqliteTable(
  "issues",
  {
    id: text("id").primaryKey(),
    workspace_id: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    user_id: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    status: text("status").notNull().default("open"),
    created_at: text("created_at").notNull(),
  },
  (t) => [index("issues_workspace").on(t.workspace_id)],
);
export const audit = sqliteTable(
  "audit",
  {
    id: text("id").primaryKey(),
    workspace_id: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    actor_id: text("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    created_at: text("created_at").notNull(),
  },
  (t) => [index("audit_workspace_date").on(t.workspace_id, t.created_at)],
);
export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  hits: integer("hits").notNull(),
  expires_at: integer("expires_at").notNull(),
});
