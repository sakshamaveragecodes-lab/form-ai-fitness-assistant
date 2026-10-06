"use client";
import { Button } from "@/components/ui/button";
import { localDate, shiftDate } from "@/lib/algorithms/habits";
import {
  ArrowRight,
  ArrowUpRight,
  Dumbbell,
  Flame,
  ScanLine,
  Sparkles,
  Timer,
  TrendingUp,
} from "lucide-react";
import {
  Badge,
  Empty,
  fmt,
  goalLabel,
  LinkButton,
  Macro,
  Metric,
  PageTitle,
  Panel,
  Ring,
  useFitness,
} from "./common";
export default function Dashboard() {
  const { s, navigate } = useFitness();
  const actual = s.workouts.filter((w) => w.source !== "replay"),
    week = actual.filter(
      (w) =>
        localDate(s.profile.timezone, new Date(w.performed_at)) >=
        shiftDate(s.today, -6),
    );
  const latest = actual.find((w) => w.score !== null);
  const totals = s.logs
    .filter((l) => l.date === s.today)
    .reduce(
      (a, l) => ({
        calories: a.calories + l.calories,
        protein: a.protein + l.protein,
        carbs: a.carbs + l.carbs,
        fat: a.fat + l.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
  const upcoming = s.schedule.find(
    (x) => x.date >= s.today && x.status === "scheduled",
  );
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = shiftDate(s.today, i - 6),
      minutes = actual
        .filter(
          (w) =>
            localDate(s.profile.timezone, new Date(w.performed_at)) === date,
        )
        .reduce((a, w) => a + w.duration / 60, 0);
    return { date, minutes };
  });
  const max = Math.max(45, ...days.map((d) => d.minutes));
  return (
    <>
      <PageTitle
        eyebrow="A LITTLE BETTER, EVERY DAY"
        title={`Let’s move, ${s.user.name.split(" ")[0]}.`}
        description="Your effort is adding up. Here’s the bigger picture."
        action={
          <Button onClick={() => navigate("trainer")}>
            <ScanLine size={17} />
            Start a workout
          </Button>
        }
      />
      {!s.profile.onboarded && (
        <div className="callout">
          <div>
            <strong>Make this space yours.</strong>
            <p>
              Complete your profile to personalize your plans and daily targets.
            </p>
          </div>
          <Button onClick={() => navigate("onboarding")}>
            Set up my profile
            <ArrowRight size={16} />
          </Button>
        </div>
      )}
      <div className="dashboard-top">
        <section className="workout-hero">
          <div className="hero-meta">
            <Badge tone="dark-lime">
              {upcoming?.date === s.today
                ? "ON YOUR PLAN TODAY"
                : "YOUR NEXT GOOD SESSION"}
            </Badge>
            <span>
              <Timer size={15} />
              25–30 min
            </span>
          </div>
          <div className="hero-body">
            <div>
              <h2>{upcoming?.title ?? "Build your foundation."}</h2>
              <p>
                Move with control.
                <br />
                Leave a little stronger.
              </p>
              <div className="hero-facts">
                <span>Full body</span>
                <span>4 movements</span>
                <span>{s.profile.experience}</span>
              </div>
            </div>
            <div className="hero-score">
              <Ring
                value={s.habits.consistency}
                label={s.habits.due ? `${s.habits.consistency}%` : "—"}
                sub="weekly consistency"
                size={150}
              />
            </div>
          </div>
          <div className="hero-bottom">
            <Button className="btn-lime" onClick={() => navigate("trainer")}>
              Let’s get moving
              <ArrowRight size={17} />
            </Button>
            <span>
              {upcoming
                ? `${upcoming.date === s.today ? "Today" : new Date(upcoming.date + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} · ${upcoming.time}`
                : "Find a plan that fits your week"}
            </span>
          </div>
        </section>
        <section className="goal-card">
          <span className="icon-tile lavender">
            <TrendingUp size={21} />
          </span>
          <p className="eyebrow">YOUR CURRENT FOCUS</p>
          <h2>{goalLabel(s.profile.goal)}</h2>
          <p>
            Consistency first.
            <br />
            Progress will follow.
          </p>
          <div className="goal-line">
            <span>{s.profile.days.length} days / week</span>
            <span>
              {s.profile.equipment.includes("dumbbells")
                ? "Dumbbells + bodyweight"
                : "Bodyweight"}
            </span>
          </div>
          <LinkButton onClick={() => navigate("profile")}>
            Review your goals
          </LinkButton>
        </section>
      </div>
      <div className="grid-3 metrics-grid">
        <Metric
          icon={Dumbbell}
          label="Workouts this week"
          value={week.length}
          unit="sessions"
          detail={`${Math.round(week.reduce((n, w) => n + w.duration / 60, 0))} minutes invested in yourself`}
        />
        <Metric
          icon={Flame}
          label="Your training rhythm"
          value={s.habits.streak}
          unit="in a row"
          detail="Consecutive scheduled sessions completed"
          color="peach"
        />
        <Metric
          icon={TrendingUp}
          label="Latest performance"
          value={latest?.score ?? "—"}
          unit={latest ? "/ 100" : ""}
          detail={
            latest
              ? `${latest.source === "seed" ? "Sample · " : ""}${latest.title}`
              : "Your first camera session starts the story"
          }
          color="lavender"
        />
      </div>
      <div className="dashboard-middle">
        <Panel
          title="Every session counts"
          subtitle="Your activity over the past 7 days"
          action={
            <LinkButton onClick={() => navigate("analytics")}>
              View progress
            </LinkButton>
          }
        >
          <div className="activity-summary">
            <strong>
              {fmt(week.reduce((n, w) => n + w.duration / 60, 0))}
              <span>active minutes</span>
            </strong>
            <Badge tone="mint">{week.length} workouts</Badge>
          </div>
          <div
            className="activity-chart"
            role="img"
            aria-label={days
              .map((d) => `${d.date}: ${Math.round(d.minutes)} minutes`)
              .join(", ")}
          >
            {days.map((d) => (
              <div className="activity-column" key={d.date}>
                <span className="bar-value">
                  {d.minutes ? Math.round(d.minutes) : "—"}
                </span>
                <div className="bar-track">
                  <div
                    className={d.date === s.today ? "today-bar" : ""}
                    style={{ height: `${(d.minutes / max) * 100}%` }}
                  />
                </div>
                <span className={d.date === s.today ? "today-label" : ""}>
                  {new Date(d.date + "T12:00:00Z").toLocaleDateString("en-GB", {
                    weekday: "short",
                  })}
                </span>
              </div>
            ))}
          </div>
          <p className="chart-caption">
            <span className="legend-dot" />
            Training minutes ·{" "}
            {s.user.demo
              ? "includes labelled sample history"
              : "recorded sessions"}
          </p>
        </Panel>
        <Panel
          title="Fuel for your day"
          subtitle="Today’s nutrition"
          action={
            <button
              className="icon-button"
              aria-label="Open nutrition"
              onClick={() => navigate("nutrition")}
            >
              <ArrowUpRight size={20} />
            </button>
          }
        >
          <div className="calorie-summary">
            <div>
              <span className="muted small">ENERGY CONSUMED</span>
              <h3>
                {fmt(totals.calories)}
                <small>kcal</small>
              </h3>
              <p className="muted small">
                of {s.nutrition.calories ? fmt(s.nutrition.calories) : "—"}{" "}
                estimated target
              </p>
            </div>
            <Ring
              value={totals.calories}
              max={s.nutrition.calories ?? 2000}
              size={88}
              label={
                s.nutrition.calories
                  ? `${Math.round((totals.calories / s.nutrition.calories) * 100)}%`
                  : "—"
              }
              color="#a9c865"
            />
          </div>
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
          <Button
            variant="outline"
            className="full-width"
            onClick={() => navigate("nutrition")}
          >
            Log a meal
            <ArrowRight size={16} />
          </Button>
        </Panel>
      </div>
      <div className="dashboard-bottom">
        <Panel
          title="Your recent sessions"
          action={
            <LinkButton onClick={() => navigate("workouts")}>
              All workouts
            </LinkButton>
          }
        >
          {actual.length ? (
            <div className="workout-list">
              {actual.slice(0, 3).map((w) => (
                <button
                  className="workout-row"
                  key={w.id}
                  onClick={() => navigate("workouts")}
                >
                  <span className="icon-tile neutral">
                    <Dumbbell size={19} />
                  </span>
                  <div>
                    <strong>{w.title}</strong>
                    <p>
                      {new Date(w.performed_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        timeZone: s.profile.timezone,
                      })}{" "}
                      · {Math.round(w.duration / 60)} min{" "}
                      {w.source === "seed" && "· Sample"}
                    </p>
                  </div>
                  <span className="score-pill">
                    {w.score !== null ? `${w.score} pts` : "Logged"}
                  </span>
                  <ArrowUpRight size={17} />
                </button>
              ))}
            </div>
          ) : (
            <Empty
              title="Your first session starts here"
              body="Train with your camera or log a completed workout."
              action={
                <Button onClick={() => navigate("workouts")}>
                  Choose a workout
                </Button>
              }
            />
          )}
        </Panel>
        <section className="buddy-card">
          <div className="buddy-card-title">
            <span className="buddy-icon">
              <Sparkles size={21} />
            </span>
            <Badge tone="lavender">YOUR GYM BUDDY</Badge>
          </div>
          <h2>
            Small steps.
            <br />
            Stronger habits.
          </h2>
          <p>
            {s.habits.coldStart
              ? "Start with something manageable. Your first few sessions help us understand your rhythm."
              : s.habits.risk >= 30
                ? "A lighter session might be the right move today. Let’s make the plan fit your energy."
                : "Your routine is taking shape. Keep the next session manageable and repeatable."}
          </p>
          <button onClick={() => navigate("buddy")}>
            Let’s talk about today
            <ArrowRight size={18} />
          </button>
        </section>
      </div>
    </>
  );
}
