import type { Rep } from "../types";
import { clamp } from "./nutrition";
export function performanceScore(reps: Rep[], target: number) {
  if (!reps.length)
    return {
      score: null,
      form: null,
      rom: null,
      tempo: null,
      consistency: null,
      completion: 0,
    };
  const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
  const form = mean(reps.map((x) => clamp(x.form, 0, 100))),
    rom = mean(reps.map((x) => clamp(x.range, 0, 100))),
    tempo = mean(reps.map((x) => clamp(x.tempo, 0, 100)));
  const durations = reps.map((x) => x.duration),
    avg = mean(durations);
  const variance = mean(durations.map((x) => (x - avg) ** 2));
  const consistency =
    reps.length < 2
      ? null
      : clamp(100 * (1 - Math.sqrt(variance) / Math.max(avg, 0.1)), 0, 100);
  const completion = clamp((reps.length / Math.max(1, target)) * 100, 0, 100);
  const score =
    (0.35 * form +
      0.25 * rom +
      0.15 * tempo +
      0.1 * completion +
      (consistency === null ? 0 : 0.15 * consistency)) /
    (consistency === null ? 0.85 : 1);
  return {
    score: Math.round(score),
    form: Math.round(form),
    rom: Math.round(rom),
    tempo: Math.round(tempo),
    consistency: consistency === null ? null : Math.round(consistency),
    completion: Math.round(completion),
  };
}
