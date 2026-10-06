import { localDate, shiftDate } from "../algorithms/habits";
import { makeMealPlan } from "../algorithms/nutrition";
import { performanceScore } from "../algorithms/performance";
import { CATALOG } from "../catalog";
import { DEFAULT_PROFILE, type CatalogItem, type Profile } from "../types";
import { batch, now, statement, uid } from "./db";
export async function seedWorkspace(
  userId: string,
  workspace: string,
  demo: boolean,
  isAdmin = false,
) {
  const p: Profile = {
    ...DEFAULT_PROFILE,
    ...(demo
      ? {
          sex: "male" as const,
          height: 175,
          goal: "muscle" as const,
          equipment: ["bodyweight", "dumbbells"],
          onboarded: true,
        }
      : {}),
  };
  const today = localDate(p.timezone),
    time = now();
  const items: CatalogItem[] = CATALOG.map((c) => ({
    ...c,
    id: uid(),
    active: 1,
  }));
  const q = [
    statement(
      "INSERT INTO profiles (user_id,data,updated_at) VALUES (?,?,?)",
      userId,
      JSON.stringify(p),
      time,
    ),
    ...items.map((x) =>
      statement(
        "INSERT INTO catalog (id,workspace_id,kind,name,description,data,active,updated_at) VALUES (?,?,?,?,?,?,1,?)",
        x.id,
        workspace,
        x.kind,
        x.name,
        x.description,
        JSON.stringify(x.data),
        time,
      ),
    ),
  ];
  q.push(
    statement(
      "INSERT INTO chat_sessions (id,user_id,created_at) VALUES (?,?,?)",
      uid(),
      userId,
      time,
    ),
  );
  q.push(
    statement(
      "INSERT INTO notifications (id,user_id,title,body,kind,created_at) VALUES (?,?,?,?,?,?)",
      uid(),
      userId,
      demo ? "Welcome to your demo workspace" : "Welcome to FORM",
      demo
        ? "This workspace contains clearly labelled sample activity. Your changes are isolated from other accounts."
        : "Start with your fitness profile, then choose a manageable first session.",
      "welcome",
      time,
    ),
  );
  if (demo) {
    for (let day = -27; day <= 14; day++) {
      const date = shiftDate(today, day);
      if (!p.days.includes(new Date(date + "T12:00:00Z").getUTCDay())) continue;
      const missed = day < -15 && day % 4 === 0,
        status = day < 0 ? (missed ? "skipped" : "completed") : "scheduled";
      q.push(
        statement(
          "INSERT INTO schedule (id,user_id,date,time,title,status) VALUES (?,?,?,?,?,?)",
          uid(),
          userId,
          date,
          p.workoutTime,
          "Dumbbell essentials",
          status,
        ),
      );
      if (status === "completed") {
        const slug = day % 2 === 0 ? "squat" : "curl";
        const reps = Array.from({ length: 12 }, (_, i) => ({
          duration: 3 + (i % 3) * 0.12,
          range: 78 + Math.floor((day + 27) / 3),
          form: 76 + Math.floor((day + 27) / 2),
          tempo: 88 + (i % 4),
        }));
        const score = performanceScore(reps, 12);
        q.push(
          statement(
            "INSERT INTO workouts (id,user_id,title,exercise,reps,sets,duration,resistance,rpe,score,form,rom,tempo,consistency,completion,source,metrics,notes,performed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            uid(),
            userId,
            slug === "squat" ? "Lower body foundation" : "Upper body strength",
            slug,
            12,
            3,
            1500 + (day % 3) * 180,
            slug === "squat" ? 0 : 8,
            6,
            score.score,
            score.form,
            score.rom,
            score.tempo,
            score.consistency,
            score.completion,
            "seed",
            JSON.stringify(reps),
            "Sample workout for demonstration",
            date + "T12:30:00.000Z",
          ),
        );
      }
    }
    for (const [i, m] of items
      .filter((x) => x.kind === "meals")
      .slice(0, 2)
      .entries())
      q.push(
        statement(
          "INSERT INTO nutrition_logs (id,user_id,food_name,calories,protein,carbs,fat,meal,quantity,date) VALUES (?,?,?,?,?,?,?,?,?,?)",
          uid(),
          userId,
          m.name,
          m.data.calories,
          m.data.protein,
          m.data.carbs,
          m.data.fat,
          i ? "Lunch" : "Breakfast",
          1,
          today,
        ),
      );
    const plan = makeMealPlan(
      items.filter((x) => x.kind === "meals"),
      p,
      today,
    );
    q.push(
      statement(
        "INSERT INTO diet_plans (id,user_id,date,data) VALUES (?,?,?,?)",
        plan.id,
        userId,
        today,
        JSON.stringify(plan),
      ),
    );
  }
  const deviceId = uid();
  q.push(
    statement(
      "INSERT INTO devices (id,workspace_id,user_id,name,exercise,mode,active,created_at) VALUES (?,?,?,?,?,?,1,?)",
      deviceId,
      workspace,
      userId,
      "Studio dumbbell station",
      "curl",
      "simulated",
      time,
    ),
  );
  if (isAdmin)
    for (const [i, name] of [
      "Maya Chen",
      "Rohan Mehta",
      "Jamie Lee",
    ].entries()) {
      const id = uid();
      q.push(
        statement(
          "INSERT INTO users (id,workspace_id,email,name,password_hash,recovery_hash,role,status,demo,created_at) VALUES (?,?,?,?,?,?,?,?,1,?)",
          id,
          workspace,
          `${id}@example.invalid`,
          name,
          "disabled",
          "disabled",
          "user",
          i === 2 ? "suspended" : "active",
          time,
        ),
      );
      q.push(
        statement(
          "INSERT INTO profiles (user_id,data,updated_at) VALUES (?,?,?)",
          id,
          JSON.stringify({ ...p, llmConsent: false }),
          time,
        ),
      );
    }
  // D1 batches are atomic. Keep the workspace seed in one bounded transaction.
  await batch(q);
}
