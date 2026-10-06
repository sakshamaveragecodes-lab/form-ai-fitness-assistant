"use client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { localDate, shiftDate } from "@/lib/algorithms/habits";
import { download } from "@/lib/api";
import { Download, Dumbbell, Timer, TrendingUp } from "lucide-react";
import { useState } from "react";
import { TrendChart, UsageChart } from "./charts";
import {
  Choice,
  Empty,
  Field,
  Macro,
  Metric,
  PageTitle,
  Panel,
  useFitness,
} from "./common";
export default function Analytics() {
  const { s } = useFitness();
  const [exercise, setExercise] = useState("all"),
    [samples, setSamples] = useState(!!s.user.demo),
    [period, setPeriod] = useState("28");
  const filtered = s.workouts.filter(
    (w) =>
      w.source !== "replay" &&
      (samples || w.source !== "seed") &&
      (exercise === "all" || w.exercise === exercise) &&
      localDate(s.profile.timezone, new Date(w.performed_at)) >=
        shiftDate(s.today, -Number(period) + 1),
  );
  const scored = filtered
    .filter((w) => w.score !== null)
    .sort((a, b) => a.performed_at.localeCompare(b.performed_at));
  const dates = [
    ...new Set(
      scored.map((w) =>
        localDate(s.profile.timezone, new Date(w.performed_at)),
      ),
    ),
  ].sort();
  const mean = (a: number[]) =>
    a.length ? Math.round(a.reduce((s, v) => s + v, 0) / a.length) : 0;
  const data = dates.map((date) => {
    const rows = scored.filter(
      (w) => localDate(s.profile.timezone, new Date(w.performed_at)) === date,
    );
    return {
      date,
      score: mean(rows.map((x) => x.score!)),
      form: mean(rows.map((x) => x.form ?? 0)),
      rom: mean(rows.filter((x) => x.rom !== null).map((x) => x.rom!)),
      tempo: mean(rows.filter((x) => x.tempo !== null).map((x) => x.tempo!)),
    };
  });
  const latest = scored.at(-1),
    previous = latest
      ? scored
          .slice(0, -1)
          .filter((x) => x.exercise === latest.exercise)
          .at(-1)
      : null;
  const difference =
    latest && previous ? latest.score! - previous.score! : null;
  const weeks = Array.from({ length: Math.ceil(+period / 7) }, (_, i) => {
    const end = shiftDate(s.today, -(Math.ceil(+period / 7) - 1 - i) * 7),
      start = shiftDate(end, -6);
    return {
      date: start,
      sessions: filtered.filter((w) => {
        const date = localDate(s.profile.timezone, new Date(w.performed_at));
        return date >= start && date <= end;
      }).length,
    };
  });
  function report() {
    download(
      "FORM-weekly-progress.md",
      `# FORM progress report\n\nPeriod: ${shiftDate(s.today, -Number(period) + 1)} to ${s.today}\nSource: ${samples ? "Includes labelled sample sessions" : "Real camera/manual sessions only"}\n\nSessions in selected view: ${filtered.length}\nTraining minutes: ${Math.round(filtered.reduce((a, w) => a + w.duration / 60, 0))}\nMean observed score: ${scored.length ? mean(scored.map((w) => w.score!)) : "Not measured"}\n\n| Date | Exercise | Source | Reps | Minutes | Score |\n|---|---|---|---:|---:|---:|\n${filtered.map((w) => `| ${localDate(s.profile.timezone, new Date(w.performed_at))} | ${w.exercise} | ${w.source} | ${w.reps} | ${Math.round(w.duration / 60)} | ${w.score ?? "Not measured"} |`).join("\n")}\n\nScores describe captured movement, not health. Dynamic exercise weights: form 35%, range 25%, tempo 15%, consistency 15%, completion 10%. Planks: observed alignment 70%, completed hold target 30%. A one-rep session excludes the unavailable consistency dimension and renormalizes remaining weights.\n`,
      "text/markdown",
    );
  }
  return (
    <>
      <PageTitle
        eyebrow="SEE THE WORK BEHIND THE CHANGE"
        title="Your progress, in perspective."
        description="Real session history. Clear comparisons. No invented numbers."
        action={
          <Button variant="outline" onClick={report}>
            <Download size={16} />
            Export report
          </Button>
        }
      />
      <div className="analytics-filters">
        <Field label="Exercise">
          <Choice
            value={exercise}
            onChange={setExercise}
            options={[
              { value: "all", label: "All exercises" },
              ...s.catalog.exercises.map((x) => ({
                value: x.data.slug,
                label: x.name,
              })),
            ]}
          />
        </Field>
        <Field label="Time window">
          <Choice
            value={period}
            onChange={setPeriod}
            options={[
              { value: "7", label: "Last 7 days" },
              { value: "28", label: "Last 28 days" },
              { value: "90", label: "Last 90 days" },
            ]}
          />
        </Field>
        {s.user.demo === 1 && (
          <label className="switch-row">
            <span>Include sample history</span>
            <Switch checked={samples} onCheckedChange={setSamples} />
          </label>
        )}
      </div>
      <div className="grid-3">
        <Metric
          icon={TrendingUp}
          label="Mean observed performance"
          value={scored.length ? mean(scored.map((x) => x.score!)) : "—"}
          unit={scored.length ? "/ 100" : ""}
          detail={`${scored.length} scored sessions in this view`}
        />
        <Metric
          icon={Timer}
          label="Time invested"
          value={Math.round(filtered.reduce((a, w) => a + w.duration / 60, 0))}
          unit="min"
          color="lavender"
          detail={`${filtered.length} recorded training sessions`}
        />
        <Metric
          icon={Dumbbell}
          label="Same-exercise change"
          value={
            difference === null
              ? "—"
              : `${difference > 0 ? "+" : ""}${difference}`
          }
          unit={difference === null ? "" : "pts"}
          color="peach"
          detail={
            previous && latest
              ? `${latest.exercise}: latest vs previous session`
              : "Needs two scored sessions of the same exercise"
          }
        />
      </div>
      <div className="grid-2">
        <Panel
          title="The shape of your progress"
          subtitle="Daily mean of observed session scores"
        >
          {data.length ? (
            <TrendChart data={data} />
          ) : (
            <Empty
              title="Your first score starts the curve"
              body="Finish a camera workout to record form, range, tempo, and completion."
            />
          )}
        </Panel>
        <Panel
          title="Consistency, week by week"
          subtitle="Sessions grouped into 7-day periods"
        >
          <UsageChart data={weeks} />
        </Panel>
      </div>
      <div className="grid-2">
        <Panel
          title="Understand your movement"
          subtitle="Averages across scored sessions in this view."
        >
          {scored.length ? (
            <>
              {[
                ["Form quality", "form", "lime"],
                ["Range of motion", "rom", "lavender"],
                ["Tempo", "tempo", "peach"],
                ["Rep consistency", "consistency", "mint"],
              ].map(([label, key, color]) => {
                const vals = scored
                  .filter((w) => w[key as keyof typeof w] !== null)
                  .map((w) => w[key as keyof typeof w] as number);
                return vals.length ? (
                  <Macro
                    key={key}
                    label={label}
                    value={mean(vals)}
                    target={100}
                    unit="pts"
                    color={color}
                  />
                ) : (
                  <p key={key} className="muted">
                    {label}: not applicable / not enough data
                  </p>
                );
              })}
              <p className="quiet-note">
                Manual logs do not receive a form score. Synthetic replay
                sessions are always excluded here.
              </p>
            </>
          ) : (
            <Empty
              title="Movement detail needs a camera session"
              body="Manual logs still contribute to your workout duration and frequency."
            />
          )}
        </Panel>
        <Panel title="How the score works">
          <div className="score-explanation">
            {[
              ["Form quality", "35%"],
              ["Range of motion", "25%"],
              ["Controlled tempo", "15%"],
              ["Rep consistency", "15%"],
              ["Target completion", "10%"],
            ].map(([k, v]) => (
              <div key={k}>
                <span>{k}</span>
                <strong>{v}</strong>
              </div>
            ))}
          </div>
          <p className="quiet-note">
            Planks use alignment (70%) and hold completion (30%); range and
            tempo do not apply. One repetition cannot establish consistency, so
            its remaining dimensions are reweighted. Scores are estimates and
            need real-world validation.
          </p>
        </Panel>
      </div>
      <Panel title="The numbers behind the chart">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Performance</TableHead>
              <TableHead>Form</TableHead>
              <TableHead>Range</TableHead>
              <TableHead>Tempo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((d) => (
              <TableRow key={d.date}>
                <TableCell>{d.date}</TableCell>
                <TableCell>{d.score}</TableCell>
                <TableCell>{d.form}</TableCell>
                <TableCell>{d.rom || "—"}</TableCell>
                <TableCell>{d.tempo || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!data.length && (
          <p className="muted padded">No measured scores in this view.</p>
        )}
      </Panel>
    </>
  );
}
