import type { ExerciseId, Rep } from "../types";
import { clamp } from "./nutrition";
export type Landmark = {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
};
export type PoseState = {
  reps: Rep[];
  angle: number | null;
  form: number | null;
  phase: string;
  feedback: string;
  visible: boolean;
  holdSeconds: number;
  side: "left" | "right";
  landmarks: Landmark[];
};
export const POSE_CONFIG: Record<
  ExerciseId,
  { low: number; high: number; range: number; label: string }
> = {
  squat: { low: 105, high: 155, range: 75, label: "Knee" },
  pushup: { low: 100, high: 150, range: 70, label: "Elbow" },
  curl: { low: 65, high: 150, range: 95, label: "Elbow" },
  press: { low: 105, high: 155, range: 65, label: "Elbow" },
  lunge: { low: 105, high: 155, range: 70, label: "Front knee" },
  plank: { low: 160, high: 180, range: 0, label: "Body alignment" },
};
export function angle(a: Landmark, b: Landmark, c: Landmark): number {
  const v = [a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0)],
    w = [c.x - b.x, c.y - b.y, (c.z ?? 0) - (b.z ?? 0)];
  const den = Math.hypot(...v) * Math.hypot(...w);
  if (den < 1e-7) return NaN;
  return (
    (Math.acos(clamp(v.reduce((sum, x, i) => sum + x * w[i], 0) / den, -1, 1)) *
      180) /
    Math.PI
  );
}
export function plankScore(metrics: Rep[], target: number) {
  const hold = metrics.reduce((sum, x) => sum + x.duration, 0);
  if (!metrics.length)
    return {
      score: null,
      form: null,
      rom: null,
      tempo: null,
      consistency: null,
      completion: 0,
    };
  const form = metrics.reduce((sum, x) => sum + x.form * x.duration, 0) / hold,
    completion = clamp((hold / Math.max(1, target)) * 100, 0, 100);
  return {
    score: Math.round(form * 0.7 + completion * 0.3),
    form: Math.round(form),
    rom: null,
    tempo: null,
    consistency: null,
    completion: Math.round(completion),
  };
}
export class PoseEngine {
  exercise: ExerciseId;
  side: "left" | "right" | "auto";
  reps: Rep[] = [];
  holdSeconds = 0;
  private last = 0;
  private phase = "ready";
  private candidate = "";
  private candidateAt = 0;
  private start = 0;
  private min = 180;
  private max = 0;
  private forms: number[] = [];
  private smoothed: number | null = null;
  private locked: "left" | "right" | null = null;
  private holdBucket = 0;
  constructor(exercise: ExerciseId, side: "left" | "right" | "auto" = "auto") {
    this.exercise = exercise;
    this.side = side;
  }
  private resetCycle() {
    this.phase = "ready";
    this.candidate = "";
    this.start = 0;
    this.min = 180;
    this.max = 0;
    this.forms = [];
    this.smoothed = null;
  }
  update(points: Landmark[], timestamp: number, world?: Landmark[]): PoseState {
    const dt = this.last
      ? Math.max(0, Math.min((timestamp - this.last) / 1000, 0.2))
      : 0;
    if (this.last && timestamp - this.last > 600) this.resetCycle();
    this.last = timestamp;
    const left = [11, 13, 15, 23, 25, 27],
      right = [12, 14, 16, 24, 26, 28];
    if (!this.locked && points.length >= 29) {
      const sum = (ids: number[]) =>
        ids.reduce((s, i) => s + (points[i]?.visibility ?? 0), 0);
      this.locked =
        this.side === "auto"
          ? sum(left) >= sum(right)
            ? "left"
            : "right"
          : this.side;
    }
    const side = this.locked ?? "left",
      ids = side === "left" ? left : right,
      [sh, el, wr, hi, kn, an] = ids;
    const relevant =
      this.exercise === "plank"
        ? [sh, hi, an]
        : ["squat", "lunge"].includes(this.exercise)
          ? [sh, hi, kn, an]
          : [sh, el, wr, hi];
    const base = {
      reps: [...this.reps],
      holdSeconds: this.holdSeconds,
      side,
      landmarks: points,
    };
    if (
      points.length < 29 ||
      relevant.some(
        (i) =>
          !points[i] ||
          !Number.isFinite(points[i].x) ||
          !Number.isFinite(points[i].y) ||
          (points[i].visibility ?? 0) < 0.65,
      )
    ) {
      this.resetCycle();
      return {
        ...base,
        angle: null,
        form: null,
        phase: "Find your position",
        feedback:
          "Step back so the working joints are visible. Counting is paused.",
        visible: false,
      };
    }
    const p = world?.length === 33 ? world : points;
    const raw =
      this.exercise === "plank"
        ? angle(p[sh], p[hi], p[an])
        : ["squat", "lunge"].includes(this.exercise)
          ? angle(p[hi], p[kn], p[an])
          : angle(p[sh], p[el], p[wr]);
    if (!Number.isFinite(raw)) {
      this.resetCycle();
      return {
        ...base,
        angle: null,
        form: null,
        phase: "Reposition",
        feedback: "Move into a clear side view.",
        visible: false,
      };
    }
    this.smoothed =
      this.smoothed === null ? raw : this.smoothed * 0.65 + raw * 0.35;
    const joint = this.smoothed;
    const alignment = angle(p[sh], p[hi], p[an]);
    const lean =
      (Math.atan2(
        Math.abs(points[sh].x - points[hi].x),
        Math.abs(points[sh].y - points[hi].y),
      ) *
        180) /
      Math.PI;
    const horizontal =
      Math.abs(points[sh].x - points[an].x) >
      Math.abs(points[sh].y - points[an].y) * 1.2;
    let form = clamp(100 - Math.max(0, lean - 20) * 1.2, 0, 100),
      feedback = "Move smoothly and keep breathing.";
    if (this.exercise === "plank" || this.exercise === "pushup") {
      form = clamp(100 - Math.max(0, 180 - alignment - 8) * 2, 0, 100);
      if (!horizontal) {
        this.resetCycle();
        return {
          ...base,
          angle: Math.round(joint),
          form: null,
          phase: "Set up",
          feedback:
            "Take a horizontal side-on position with your full body visible.",
          visible: false,
        };
      }
      if (alignment < 160)
        feedback =
          "Bring your shoulders, hips and ankles into a straighter line.";
    } else if (lean > 35)
      feedback = "Keep your trunk controlled; reduce the load if you need to.";
    if (this.exercise === "plank") {
      const good = joint >= 160 && horizontal;
      if (good && dt > 0) {
        this.holdSeconds += dt;
        this.holdBucket += dt;
        if (this.holdBucket >= 1) {
          this.reps.push({
            duration: this.holdBucket,
            range: 0,
            form,
            tempo: 0,
          });
          this.holdBucket = 0;
        }
      }
      return {
        ...base,
        reps: [...this.reps],
        holdSeconds: this.holdSeconds,
        angle: Math.round(joint),
        form: Math.round(form),
        phase: good ? "Hold steady" : "Reset your alignment",
        feedback: good
          ? "Steady breathing. Keep this controlled position."
          : feedback,
        visible: true,
      };
    }
    const config = POSE_CONFIG[this.exercise],
      atStart =
        this.exercise === "press" ? joint < config.low : joint > config.high,
      atEnd =
        this.exercise === "press" ? joint > config.high : joint < config.low;
    const target = atStart ? "start" : atEnd ? "end" : "";
    if (target !== this.candidate) {
      this.candidate = target;
      this.candidateAt = timestamp;
    }
    const stable = !!target && timestamp - this.candidateAt >= 120;
    if (this.phase === "ready" && stable && atStart) {
      this.phase = "start";
      this.min = joint;
      this.max = joint;
      this.forms = [];
    }
    if (this.phase !== "ready") {
      this.min = Math.min(this.min, joint);
      this.max = Math.max(this.max, joint);
      this.forms.push(form);
      if (this.phase === "start" && !atStart && !this.start)
        this.start = timestamp;
      if (this.phase === "start" && stable && atEnd && this.start)
        this.phase = "end";
      if (this.phase === "end" && stable && atStart) {
        const duration = (timestamp - this.start) / 1000;
        if (duration >= 0.8 && duration <= 20) {
          const avgForm =
              this.forms.reduce((a, b) => a + b, 0) /
              Math.max(1, this.forms.length),
            tempo =
              duration < 2
                ? clamp((duration / 2) * 100, 0, 100)
                : duration <= 6
                  ? 100
                  : clamp(100 - (duration - 6) * 12, 0, 100);
          this.reps.push({
            duration: Math.round(duration * 100) / 100,
            range: clamp(((this.max - this.min) / config.range) * 100, 0, 100),
            form: Math.round(avgForm),
            tempo: Math.round(tempo),
          });
          feedback =
            duration < 2
              ? "Slow the next repetition for better control."
              : "Complete rep. Keep that controlled rhythm.";
        }
        this.phase = "start";
        this.start = 0;
        this.min = joint;
        this.max = joint;
        this.forms = [];
      }
    }
    if (this.phase === "ready")
      feedback =
        this.exercise === "press"
          ? "Start with elbows bent, then press overhead."
          : "Begin in a comfortable extended position before your first rep.";
    return {
      ...base,
      reps: [...this.reps],
      angle: Math.round(joint),
      form: Math.round(form),
      phase:
        this.phase === "ready"
          ? "Get ready"
          : this.phase === "end"
            ? "Return with control"
            : "Move through your range",
      feedback,
      visible: true,
    };
  }
}
export function syntheticPose(exercise: ExerciseId, t: number): Landmark[] {
  const p = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.15,
    z: 0,
    visibility: 1,
  }));
  const phase = (t % 4) / 4;
  const fraction = (1 - Math.cos(phase * Math.PI * 2)) / 2;
  const joint =
    exercise === "press"
      ? 85 + 90 * fraction
      : 170 - (exercise === "curl" ? 125 : 85) * fraction;
  const endpoint = (
    a: Landmark,
    b: Landmark,
    degrees: number,
    length: number,
  ) => {
    const theta = Math.atan2(a.y - b.y, a.x - b.x) + (degrees * Math.PI) / 180;
    return {
      x: b.x + Math.cos(theta) * length,
      y: b.y + Math.sin(theta) * length,
      z: 0,
      visibility: 1,
    };
  };
  for (const offset of [0, 1]) {
    const x = offset * 0.035;
    p[11 + offset] = { x: 0.45 + x, y: 0.22, z: 0, visibility: 1 };
    p[23 + offset] = { x: 0.45 + x, y: 0.5, z: 0, visibility: 1 };
    p[25 + offset] = { x: 0.46 + x, y: 0.69, z: 0, visibility: 1 };
    p[27 + offset] = { x: 0.46 + x, y: 0.9, z: 0, visibility: 1 };
    p[13 + offset] = { x: 0.46 + x, y: 0.38, z: 0, visibility: 1 };
    p[15 + offset] = { x: 0.47 + x, y: 0.55, z: 0, visibility: 1 };
    if (exercise === "squat" || exercise === "lunge") {
      p[27 + offset] = endpoint(p[23 + offset], p[25 + offset], joint, 0.21);
    } else if (exercise === "curl" || exercise === "press") {
      p[15 + offset] = endpoint(p[11 + offset], p[13 + offset], joint, 0.18);
    } else {
      p[11 + offset] = { x: 0.2, y: 0.45 + x, z: 0, visibility: 1 };
      p[23 + offset] = { x: 0.52, y: 0.47 + x, z: 0, visibility: 1 };
      p[27 + offset] = { x: 0.86, y: 0.49 + x, z: 0, visibility: 1 };
      p[25 + offset] = { x: 0.68, y: 0.48 + x, z: 0, visibility: 1 };
      p[13 + offset] = { x: 0.21, y: 0.62 + x, z: 0, visibility: 1 };
      p[15 + offset] = endpoint(p[11 + offset], p[13 + offset], joint, 0.15);
    }
  }
  p[0] = { x: p[11].x - 0.02, y: p[11].y - 0.1, z: 0, visibility: 1 };
  return p;
}
export const CONNECTIONS = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
];
