"use client";
import { PoseCompatibility } from "./pose-check";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { performanceScore } from "@/lib/algorithms/performance";
import {
  CONNECTIONS,
  type Landmark,
  plankScore,
  POSE_CONFIG,
  PoseEngine,
  type PoseState,
  syntheticPose,
} from "@/lib/algorithms/pose";
import type { ExerciseId } from "@/lib/types";
import {
  Camera,
  CameraOff,
  Check,
  Play,
  Save,
  ScanLine,
  ShieldCheck,
  Square,
  Timer,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Badge,
  Choice,
  Field,
  PageTitle,
  Panel,
  Submit,
  useFitness,
} from "./common";
const blank: PoseState = {
  reps: [],
  angle: null,
  form: null,
  phase: "Ready when you are",
  feedback: "Choose your exercise and give yourself room to move.",
  visible: false,
  holdSeconds: 0,
  side: "left",
  landmarks: [],
};
export default function Trainer() {
  const { s, act, busy } = useFitness();
  const initial =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("exercise")
      : null;
  const [exercise, setExercise] = useState<ExerciseId>(
      (["squat", "pushup", "curl", "press", "lunge", "plank"].includes(
        initial ?? "",
      )
        ? initial
        : "squat") as ExerciseId,
    ),
    [side, setSide] = useState<"auto" | "left" | "right">("auto"),
    [target, setTarget] = useState(8),
    [setTargetCount, setSetTargetCount] = useState(2),
    [captureSource, setCaptureSource] = useState<"camera" | "replay">("camera"),
    [mode, setMode] = useState<
      "idle" | "starting" | "camera" | "replay" | "stopped"
    >("idle"),
    [pose, setPose] = useState<PoseState>(blank),
    [elapsed, setElapsed] = useState(0),
    [rest, setRest] = useState(0),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  const video = useRef<HTMLVideoElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    worker = useRef<Worker | null>(null),
    stream = useRef<MediaStream | null>(null),
    raf = useRef(0),
    active = useRef(false),
    pending = useRef(false),
    engine = useRef(new PoseEngine("squat")),
    started = useRef(0),
    restUntil = useRef(0),
    completedSets = useRef(0),
    source = useRef<"camera" | "replay">("camera"),
    frameTime = useRef(0),
    elapsedRef = useRef(0);
  const item = s.catalog.exercises.find((x) => x.data.slug === exercise),
    running = ["camera", "replay", "starting"].includes(mode);
  function shutdown() {
    active.current = false;
    cancelAnimationFrame(raf.current);
    worker.current?.terminate();
    worker.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (video.current) {
      video.current.pause();
      video.current.srcObject = null;
    }
    pending.current = false;
  }
  useEffect(() => () => shutdown(), []);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      elapsedRef.current = (performance.now() - started.current) / 1000;
      setElapsed(elapsedRef.current);
      setRest(
        Math.max(0, Math.ceil((restUntil.current - performance.now()) / 1000)),
      );
    }, 250);
    return () => clearInterval(timer);
  }, [running]);
  function stop() {
    shutdown();
    setMode("stopped");
    setRest(0);
  }
  function draw(points: Landmark[], replay: boolean) {
    const c = canvas.current;
    if (!c) return;
    if (!replay && video.current?.videoWidth) {
      c.width = video.current.videoWidth;
      c.height = video.current.videoHeight;
    } else if (replay) {
      c.width = 960;
      c.height = 540;
    }
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    if (replay) {
      ctx.fillStyle = "#19282f";
      ctx.fillRect(0, 0, c.width, c.height);
    }
    ctx.strokeStyle = "#dcfa7b";
    ctx.fillStyle = "#e3fc9b";
    ctx.lineWidth = 3;
    for (const [a, b] of CONNECTIONS) {
      if (
        (points[a]?.visibility ?? 0) < 0.65 ||
        (points[b]?.visibility ?? 0) < 0.65
      )
        continue;
      ctx.beginPath();
      ctx.moveTo(points[a].x * c.width, points[a].y * c.height);
      ctx.lineTo(points[b].x * c.width, points[b].y * c.height);
      ctx.stroke();
    }
    for (const p of points) {
      if ((p.visibility ?? 0) < 0.65) continue;
      ctx.beginPath();
      ctx.arc(p.x * c.width, p.y * c.height, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  function process(points: Landmark[], timestamp: number, world?: Landmark[]) {
    draw(points, source.current === "replay");
    if (timestamp < restUntil.current) return;
    const next = engine.current.update(points, timestamp, world);
    setPose(next);
    const progress = exercise === "plank" ? next.holdSeconds : next.reps.length,
      newSets = Math.floor(progress / target);
    if (newSets > completedSets.current) {
      completedSets.current = newSets;
      if (newSets >= setTargetCount) {
        stop();
        toast.success(
          "Session target reached. Save your results when you’re ready.",
        );
      } else {
        restUntil.current = timestamp + 30000;
        setRest(30);
        toast("Set complete. Take a 30-second rest or extend it if needed.");
      }
    }
  }
  async function start(replay = false) {
    shutdown();
    setError("");
    setSaved(false);
    setPose(blank);
    setElapsed(0);
    setRest(0);
    elapsedRef.current = 0;
    engine.current = new PoseEngine(exercise, side);
    completedSets.current = 0;
    restUntil.current = 0;
    started.current = performance.now();
    frameTime.current = 0;
    source.current = replay ? "replay" : "camera";
    setCaptureSource(source.current);
    active.current = true;
    if (replay) {
      setMode("replay");
      const loop = (time: number) => {
        if (!active.current) return;
        if (time - frameTime.current >= 80) {
          frameTime.current = time;
          process(
            syntheticPose(exercise, (time - started.current) / 1000),
            time,
          );
        }
        if (active.current) raf.current = requestAnimationFrame(loop);
      };
      raf.current = requestAnimationFrame(loop);
      return;
    }
    setMode("starting");
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)
        throw new Error(
          "Camera access needs HTTPS (or localhost) and a supported browser. The motion replay is available here.",
        );
      const media = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 960 },
          height: { ideal: 540 },
          facingMode: "user",
        },
        audio: false,
      });
      if (!active.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      if (!video.current) throw new Error("Camera preview is unavailable.");
      video.current.srcObject = media;
      await video.current.play();
      const w = new Worker("/pose-worker.js");
      worker.current = w;
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () =>
            reject(
              new Error(
                "Pose model took too long to load. Check your connection and retry.",
              ),
            ),
          25000,
        );
        w.onmessage = (e) => {
          if (e.data.type === "ready") {
            clearTimeout(timeout);
            resolve();
          } else if (e.data.type === "error") {
            clearTimeout(timeout);
            reject(
              new Error(
                "The pose model could not load. Please retry or use motion replay.",
              ),
            );
          }
        };
        w.onerror = () => {
          clearTimeout(timeout);
          reject(
            new Error(
              "Your browser could not start the local pose engine. Try an up-to-date Chrome or Edge browser.",
            ),
          );
        };
        w.postMessage({ type: "init" });
      });
      if (!active.current) return;
      setMode("camera");
      started.current = performance.now();
      w.onmessage = (e) => {
        pending.current = false;
        if (!active.current) return;
        if (e.data.type === "pose")
          process(e.data.landmarks, e.data.timestamp, e.data.world);
        else if (e.data.type === "error") {
          setError("Pose tracking stopped. Reposition and start again.");
          stop();
        }
      };
      const loop = async (time: number) => {
        if (!active.current) return;
        if (
          time - frameTime.current >= 90 &&
          !pending.current &&
          video.current?.readyState === 4
        ) {
          frameTime.current = time;
          pending.current = true;
          try {
            const bitmap = await createImageBitmap(video.current);
            if (active.current && worker.current)
              worker.current.postMessage(
                { type: "frame", bitmap, timestamp: time },
                [bitmap],
              );
            else bitmap.close();
          } catch {
            pending.current = false;
          }
        }
        if (active.current) raf.current = requestAnimationFrame(loop);
      };
      raf.current = requestAnimationFrame(loop);
    } catch (e) {
      shutdown();
      setMode("idle");
      setError(
        (e as Error).name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access in your browser settings, then try again. You can still use motion replay."
          : (e as Error).name === "NotFoundError"
            ? "No camera was found. Connect one, or use the labelled motion replay."
            : (e as Error).message,
      );
    }
  }
  async function save() {
    stop();
    const metrics = engine.current.reps;
    if (!metrics.length) {
      toast.error(
        "Complete one controlled repetition or a full second of a valid plank before saving.",
      );
      return;
    }
    const result = await act(
      "workouts",
      "POST",
      {
        title: item?.name ?? exercise,
        exercise,
        reps: exercise === "plank" ? 0 : metrics.length,
        sets: Math.max(
          1,
          Math.ceil(
            (exercise === "plank"
              ? engine.current.holdSeconds
              : metrics.length) / target,
          ),
        ),
        duration: Math.max(1, Math.round(elapsedRef.current)),
        resistance: 0,
        rpe: 6,
        source: source.current,
        metrics,
        target: target * setTargetCount,
        notes:
          source.current === "replay"
            ? "Synthetic landmark demonstration. Excluded from real training and adherence totals."
            : "Client-side pose estimates. Camera frames were not transmitted.",
      },
      source.current === "replay"
        ? "Demo replay saved separately from your real training."
        : "Session saved. Nice work.",
    );
    if (result) setSaved(true);
  }
  const score =
    exercise === "plank"
      ? plankScore(pose.reps, target * setTargetCount)
      : performanceScore(pose.reps, target * setTargetCount);
  return (
    <>
      <PageTitle
        eyebrow="YOUR FORM, IN FOCUS"
        title="Live trainer"
        description="Six movements. Immediate feedback. Your camera stays yours."
        action={
          <Badge tone="mint">
            <ShieldCheck size={14} />
            On-device analysis
          </Badge>
        }
      />
      <div className="trainer-layout">
        <div>
          <section className="camera-stage">
            <video
              ref={video}
              muted
              playsInline
              className={captureSource === "replay" ? "hidden-video" : ""}
            />
            <canvas ref={canvas} width={960} height={540} />
            {mode === "idle" && (
              <div className="camera-empty">
                <span>
                  <ScanLine size={42} strokeWidth={1.5} />
                </span>
                <h2>Find your frame.</h2>
                <p>
                  Stand side-on, with your full working limb visible.
                  <br />
                  Start when you have enough space to move safely.
                </p>
                <Button className="btn-lime" onClick={() => start(false)}>
                  <Camera size={17} />
                  Enable camera & start
                </Button>
                <button onClick={() => start(true)}>
                  Try a synthetic motion replay
                  <ArrowRightIcon />
                </button>
              </div>
            )}
            {mode === "starting" && (
              <div className="camera-empty">
                <span className="pulse">
                  <ScanLine size={42} />
                </span>
                <h2>Preparing your camera…</h2>
                <p>Loading the pose model locally on your device.</p>
                <Button variant="outline" onClick={stop}>
                  Cancel
                </Button>
              </div>
            )}
            <div className="camera-top">
              <Badge tone="dark">
                {mode === "replay" ||
                (captureSource === "replay" && mode === "stopped")
                  ? "SYNTHETIC MOTION · DEMO"
                  : mode === "camera"
                    ? "LIVE CAMERA"
                    : "PRIVATE TRAINING"}
              </Badge>
              <span>
                {Math.floor(elapsed / 60)
                  .toString()
                  .padStart(2, "0")}
                :
                {Math.floor(elapsed % 60)
                  .toString()
                  .padStart(2, "0")}
              </span>
            </div>
            {rest > 0 && (
              <div className="rest-overlay">
                <Timer size={30} />
                <h2>Take a breath.</h2>
                <strong>{rest}s</strong>
                <p>Rest between sets. Take longer if you need it.</p>
                <Button
                  onClick={() => {
                    restUntil.current += 30000;
                    setRest(rest + 30);
                  }}
                >
                  Add 30 seconds
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    restUntil.current = 0;
                    setRest(0);
                  }}
                >
                  I’m ready
                </Button>
              </div>
            )}
            {mode === "stopped" && (
              <div className="session-stopped">
                <Check size={26} />
                <span>Session stopped · Camera off</span>
              </div>
            )}
          </section>
          {error && (
            <div className="form-error camera-error" role="alert">
              <CameraOff size={20} />
              <span>{error}</span>
            </div>
          )}
          <div className="trainer-controls">
            {running ? (
              <>
                <Button variant="outline" onClick={stop}>
                  <Square size={16} />
                  Stop session
                </Button>
                <Button onClick={save} disabled={busy || !pose.reps.length}>
                  <Save size={16} />
                  Finish & save
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => start(false)} disabled={busy}>
                  <Camera size={17} />
                  {mode === "stopped" ? "New camera session" : "Start camera"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => start(true)}
                  disabled={busy}
                >
                  <Play size={16} />
                  Motion replay
                </Button>
                {mode === "stopped" && (
                  <Submit
                    busy={busy}
                    onClick={save}
                    disabled={saved || !pose.reps.length}
                  >
                    <Save size={16} />
                    {saved ? "Saved" : "Save session"}
                  </Submit>
                )}
              </>
            )}
          </div>
          <div
            className={`live-feedback ${pose.visible ? "tracking" : ""}`}
            aria-live="polite"
          >
            <span className="icon-tile mint">
              <ActivityIcon />
            </span>
            <div>
              <strong>{rest ? "Recovery between sets" : pose.phase}</strong>
              <p>
                {rest
                  ? "Take your time. Tracking resumes after the rest timer."
                  : pose.feedback}
              </p>
            </div>
          </div>
          <div className="trainer-stats">
            <div>
              <span>{exercise === "plank" ? "VALID HOLD" : "REPETITIONS"}</span>
              <strong>
                {exercise === "plank"
                  ? Math.floor(pose.holdSeconds)
                  : pose.reps.length}
                <small>
                  {" "}
                  / {target * setTargetCount}
                  {exercise === "plank" ? "s" : ""}
                </small>
              </strong>
            </div>
            <div>
              <span>SETS COMPLETED</span>
              <strong>
                {Math.floor(
                  (exercise === "plank" ? pose.holdSeconds : pose.reps.length) /
                    target,
                )}
                <small> / {setTargetCount}</small>
              </strong>
            </div>
            <div>
              <span>{POSE_CONFIG[exercise].label.toUpperCase()}</span>
              <strong>
                {pose.angle ?? "—"}
                <small>°</small>
              </strong>
            </div>
            <div>
              <span>PERFORMANCE</span>
              <strong>
                {score.score ?? "—"}
                <small> / 100</small>
              </strong>
            </div>
          </div>
        </div>
        <aside>
          <Panel title="Your session">
            <Field label="Exercise">
              <Choice
                disabled={running}
                value={exercise}
                onChange={(v) => {
                  setExercise(v as ExerciseId);
                  setTarget(v === "plank" ? 30 : 8);
                  setPose(blank);
                  setMode("idle");
                  canvas.current?.getContext("2d")?.clearRect(0, 0, 960, 540);
                }}
                options={s.catalog.exercises.map((x) => ({
                  value: x.data.slug,
                  label: x.name,
                }))}
              />
            </Field>
            <div className="form-grid">
              <Field
                label={exercise === "plank" ? "Seconds / set" : "Reps / set"}
              >
                <Input
                  disabled={running}
                  type="number"
                  min={1}
                  max={60}
                  value={target}
                  onChange={(e) =>
                    setTarget(Math.max(1, Math.min(60, +e.target.value)))
                  }
                />
              </Field>
              <Field label="Sets">
                <Input
                  disabled={running}
                  type="number"
                  min={1}
                  max={8}
                  value={setTargetCount}
                  onChange={(e) =>
                    setSetTargetCount(Math.max(1, Math.min(8, +e.target.value)))
                  }
                />
              </Field>
            </div>
            <Field label="Tracking side">
              <Choice
                value={side}
                disabled={running}
                onChange={(v) => setSide(v as typeof side)}
                options={[
                  { value: "auto", label: "Auto · best visible side" },
                  { value: "left", label: "Left side" },
                  { value: "right", label: "Right side" },
                ]}
              />
            </Field>
            <p className="camera-hint">
              <ScanLine size={17} />
              {item?.data.camera}
            </p>
          </Panel>
          <Panel title="Keep these in mind">
            <ol className="cue-list">
              {item?.data.cues?.map((c: string, i: number) => (
                <li key={c}>
                  <span>{i + 1}</span>
                  {c}
                </li>
              ))}
            </ol>
          </Panel>
          <div className="privacy-card">
            <ShieldCheck />
            <div>
              <strong>You’re in control.</strong>
              <p>
                Camera access starts only when you choose. Frames are processed
                locally. Only session summaries and repetition metrics are
                saved.
              </p>
            </div>
          </div>
          <PoseCompatibility />
          <p className="quiet-note">
            Movement scores are estimates. Low visibility pauses counting. Stop
            for pain, dizziness, or discomfort. Motion replay uses generated
            landmarks and does not count toward real activity.
          </p>
        </aside>
      </div>
    </>
  );
}
function ArrowRightIcon() {
  return <span aria-hidden>→</span>;
}
function ActivityIcon() {
  return <ScanLine size={21} />;
}
