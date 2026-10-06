"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { ExerciseId, Workout } from "@/lib/types";
import { ArrowRight, Dumbbell, Plus, ScanLine, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  Badge,
  Choice,
  Confirm,
  Empty,
  Field,
  PageTitle,
  Panel,
  Submit,
  useFitness,
} from "./common";
export default function Workouts() {
  const { s, navigate, act, busy } = useFitness();
  const [open, setOpen] = useState(false),
    [detail, setDetail] = useState<Workout | null>(null),
    [remove, setRemove] = useState(""),
    [page, setPage] = useState(1),
    [exercise, setExercise] = useState<ExerciseId>("squat"),
    [reps, setReps] = useState(10),
    [sets, setSets] = useState(3),
    [minutes, setMinutes] = useState(20),
    [resistance, setResistance] = useState(0),
    [rpe, setRpe] = useState(6),
    [notes, setNotes] = useState(""),
    [search, setSearch] = useState("");
  const filtered = s.workouts.filter((w) =>
      (w.title + " " + w.exercise).toLowerCase().includes(search.toLowerCase()),
    ),
    items = filtered.slice((page - 1) * 10, page * 10);
  async function log(e: React.FormEvent) {
    e.preventDefault();
    const ex = s.catalog.exercises.find((x) => x.data.slug === exercise),
      result = await act(
        "workouts",
        "POST",
        {
          title: ex?.name ?? exercise,
          exercise,
          reps: reps * sets,
          sets,
          duration: minutes * 60,
          resistance,
          rpe,
          source: "manual",
          metrics: [],
          target: reps * sets,
          notes,
        },
        "Workout saved. Your effort counts.",
      );
    if (result) setOpen(false);
  }
  return (
    <>
      <PageTitle
        eyebrow="TRAIN WITH INTENTION"
        title="Your training space"
        description="Find your movement. Focus on control. Build from there."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus size={17} />
            Log a workout
          </Button>
        }
      />
      <Tabs defaultValue="exercises">
        <TabsList className="section-tabs">
          <TabsTrigger value="exercises">Exercise library</TabsTrigger>
          <TabsTrigger value="history">Workout history</TabsTrigger>
        </TabsList>
        <TabsContent value="exercises">
          <div className="grid-3 exercise-grid">
            {s.catalog.exercises.map((x, i) => (
              <article className="exercise-card" key={x.id}>
                <div className={`exercise-cover cover-${i % 3}`}>
                  <span className="exercise-number">0{i + 1}</span>
                  <Dumbbell size={44} strokeWidth={1.3} />
                  <Badge>{x.data.muscle}</Badge>
                </div>
                <div className="exercise-body">
                  <div className="flex-between">
                    <h2>{x.name}</h2>
                    <Badge tone="mint">CV ready</Badge>
                  </div>
                  <p>{x.description}</p>
                  <div className="exercise-facts">
                    <span>
                      {x.data.sets} sets × {x.data.reps}{" "}
                      {x.data.slug === "plank" ? "sec" : "reps"}
                    </span>
                    <span>{x.data.equipment.join(" + ")}</span>
                  </div>
                  <p className="camera-hint">
                    <ScanLine size={15} />
                    {x.data.camera}
                  </p>
                  <Button
                    variant="outline"
                    className="full-width"
                    onClick={() => navigate("trainer?exercise=" + x.data.slug)}
                  >
                    Train with feedback
                    <ArrowRight size={16} />
                  </Button>
                </div>
              </article>
            ))}
          </div>
          <p className="quiet-note">
            Exercise selection is explicit. FORM does not claim to identify
            arbitrary exercises. Camera feedback estimates visible movement and
            cannot replace qualified coaching.
          </p>
        </TabsContent>
        <TabsContent value="history">
          <Panel
            title="The work you’ve put in"
            subtitle="Camera scores, manual logs, and clearly labelled samples."
          >
            <div className="table-toolbar">
              <Input
                aria-label="Search workout history"
                placeholder="Search sessions…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
              <Badge>{filtered.length} stored sessions</Badge>
            </div>
            {items.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Volume</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell>
                        <button
                          className="text-link"
                          onClick={() => setDetail(w)}
                        >
                          {w.title}
                        </button>
                      </TableCell>
                      <TableCell>
                        {new Date(w.performed_at).toLocaleDateString("en-GB", {
                          timeZone: s.profile.timezone,
                        })}
                      </TableCell>
                      <TableCell>
                        {w.exercise === "plank"
                          ? `${Math.round(w.duration)} s hold`
                          : `${w.reps} reps / ${w.sets} sets`}
                      </TableCell>
                      <TableCell>{Math.round(w.duration / 60)} min</TableCell>
                      <TableCell>{w.score ?? "—"}</TableCell>
                      <TableCell>
                        <Badge
                          tone={w.source === "camera" ? "mint" : "neutral"}
                        >
                          {w.source === "seed" ? "Sample" : w.source}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <button
                          className="icon-button"
                          aria-label={`Delete ${w.title}`}
                          onClick={() => setRemove(w.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Empty
                title="No workouts here yet"
                body="Choose an exercise or add a manual log to begin your history."
              />
            )}
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    aria-disabled={page === 1}
                    onClick={(e) => {
                      e.preventDefault();
                      setPage(Math.max(1, page - 1));
                    }}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="page-count">
                    {page} / {Math.max(1, Math.ceil(filtered.length / 10))}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    aria-disabled={page * 10 >= filtered.length}
                    onClick={(e) => {
                      e.preventDefault();
                      setPage(
                        Math.min(
                          Math.max(1, Math.ceil(filtered.length / 10)),
                          page + 1,
                        ),
                      );
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </Panel>
        </TabsContent>
      </Tabs>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="wide-dialog">
          <DialogHeader>
            <DialogTitle>Log a completed workout</DialogTitle>
            <DialogDescription>
              Manual logs count toward your activity. They do not receive a
              camera form score.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={log}>
            <Field label="Exercise">
              <Choice
                value={exercise}
                onChange={(v) => setExercise(v as ExerciseId)}
                options={s.catalog.exercises.map((x) => ({
                  value: x.data.slug,
                  label: x.name,
                }))}
              />
            </Field>
            <div className="form-grid">
              <Field label="Reps per set">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={reps}
                  onChange={(e) => setReps(+e.target.value)}
                  required
                />
              </Field>
              <Field label="Sets">
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={sets}
                  onChange={(e) => setSets(+e.target.value)}
                  required
                />
              </Field>
              <Field label="Duration (minutes)">
                <Input
                  type="number"
                  min={1}
                  max={240}
                  value={minutes}
                  onChange={(e) => setMinutes(+e.target.value)}
                  required
                />
              </Field>
              <Field label="Resistance (kg)">
                <Input
                  type="number"
                  min={0}
                  max={500}
                  step="0.25"
                  value={resistance}
                  onChange={(e) => setResistance(+e.target.value)}
                  required
                />
              </Field>
              <Field label="Effort (RPE 1–10)">
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={rpe}
                  onChange={(e) => setRpe(+e.target.value)}
                  required
                />
              </Field>
            </div>
            <Field label="Session notes">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
              />
            </Field>
            <Submit type="submit" busy={busy} className="full-width">
              Save workout
            </Submit>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detail?.title}</DialogTitle>
            <DialogDescription>
              Recorded session details ·{" "}
              {detail?.source === "seed" ? "Sample activity" : detail?.source}
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <>
              <div className="detail-grid">
                {[
                  ["Form", detail.form],
                  ["Range of motion", detail.rom],
                  ["Tempo", detail.tempo],
                  ["Consistency", detail.consistency],
                  ["Completion", detail.completion],
                  ["Overall", detail.score],
                ].map(([k, v]) => (
                  <div key={k}>
                    <span>{k}</span>
                    <strong>{v ?? "Not measured"}</strong>
                  </div>
                ))}
              </div>
              <p className="muted">{detail.notes || "No session notes."}</p>
              <p className="small muted">
                Scores use recorded movement metrics. They are not clinical
                measurements.
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Confirm
        open={!!remove}
        onOpenChange={(v) => !v && setRemove("")}
        title="Delete this workout?"
        description="This permanently removes the session and its movement metrics."
        onConfirm={() => {
          void act(
            "workouts/" + remove,
            "DELETE",
            undefined,
            "Workout deleted.",
          );
          setRemove("");
        }}
      />
    </>
  );
}
