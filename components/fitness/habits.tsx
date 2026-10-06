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
import { shiftDate } from "@/lib/algorithms/habits";
import { download } from "@/lib/api";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock,
  Download,
  Flame,
  Plus,
  RotateCcw,
} from "lucide-react";
import { useState } from "react";
import {
  Badge,
  Empty,
  Field,
  Metric,
  PageTitle,
  Panel,
  Ring,
  Submit,
  useFitness,
} from "./common";
export default function Habits() {
  const { s, act, busy, navigate } = useFitness();
  const [open, setOpen] = useState(false),
    [moving, setMoving] = useState(""),
    [date, setDate] = useState(s.today),
    [time, setTime] = useState(s.profile.workoutTime),
    [title, setTitle] = useState("Full body foundation");
  const future = s.schedule.filter((x) => x.date >= s.today),
    days = Array.from({ length: 28 }, (_, i) => shiftDate(s.today, i - 27));
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const r = moving
      ? await act(
          "schedule/" + moving,
          "PATCH",
          { date, status: "scheduled" },
          "Session rescheduled.",
        )
      : await act(
          "schedule",
          "POST",
          { date, time, title },
          "Session added to your schedule.",
        );
    if (r) {
      setOpen(false);
      setMoving("");
    }
  }
  function calendar() {
    const escape = (t: string) =>
      t
        .replace(/\\/g, "\\\\")
        .replace(/\n/g, "\\n")
        .replace(/,/g, "\\,")
        .replace(/;/g, "\\;");
    const stamp = new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
    const events = future
      .filter((x) => x.status === "scheduled")
      .map((x) =>
        [
          "BEGIN:VEVENT",
          `UID:${x.id}@form.fitness`,
          `DTSTAMP:${stamp}`,
          `DTSTART;TZID=${s.profile.timezone}:${x.date.replace(/-/g, "")}T${x.time.replace(":", "")}00`,
          "DURATION:PT30M",
          `SUMMARY:${escape("FORM: " + x.title)}`,
          "DESCRIPTION:Warm up first. Stop if movement is painful.",
          "BEGIN:VALARM",
          "TRIGGER:-PT15M",
          "ACTION:DISPLAY",
          "DESCRIPTION:Your FORM workout starts in 15 minutes.",
          "END:VALARM",
          "END:VEVENT",
        ].join("\r\n"),
      );
    download(
      "FORM-workout-schedule.ics",
      [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//FORM//Fitness Schedule//EN",
        "CALSCALE:GREGORIAN",
        ...events,
        "END:VCALENDAR",
      ].join("\r\n"),
      "text/calendar",
    );
  }
  return (
    <>
      <PageTitle
        eyebrow="MAKE CONSISTENCY FEEL POSSIBLE"
        title="Find your rhythm."
        description="A schedule that leaves room for real life—and recovery."
        action={
          <Button
            onClick={() => {
              setMoving("");
              setOpen(true);
            }}
          >
            <Plus size={17} />
            Schedule a session
          </Button>
        }
      />
      <div className="grid-3">
        <Metric
          icon={Flame}
          label="Current streak"
          value={s.habits.streak}
          unit="sessions"
          detail="Scheduled sessions completed in a row"
          color="peach"
        />
        <Metric
          icon={CalendarDays}
          label="Weekly consistency"
          value={`${s.habits.consistency}%`}
          detail={`${s.habits.done} of ${s.habits.due} due sessions completed`}
        />
        <Metric
          icon={Clock}
          label="Your usual training time"
          value={s.habits.preferredTime}
          detail={`Observed from stored history · ${s.profile.timezone}`}
          color="lavender"
        />
      </div>
      <div className="grid-2">
        <Panel title="Show up, one day at a time" subtitle="Your last 28 days">
          <div className="habit-calendar">
            {days.map((d) => {
              const session = s.schedule.find((x) => x.date === d),
                status =
                  session?.status === "completed"
                    ? "complete"
                    : session && d < s.today
                      ? "missed"
                      : session
                        ? "planned"
                        : "rest";
              return (
                <div
                  className={`habit-day ${status}`}
                  key={d}
                  title={`${d}: ${status}`}
                  aria-label={`${d}: ${status}`}
                >
                  <small>
                    {new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", {
                      weekday: "short",
                    })}
                  </small>
                  <strong>{new Date(d + "T12:00:00Z").getUTCDate()}</strong>
                  {status === "complete" ? (
                    <Check size={15} />
                  ) : (
                    <span className="day-indicator" />
                  )}
                </div>
              );
            })}
          </div>
          <div className="calendar-legend">
            <span>
              <i className="complete" />
              Completed
            </span>
            <span>
              <i className="missed" />
              Missed
            </span>
            <span>
              <i className="planned" />
              Planned
            </span>
            <span>
              <i className="rest" />
              Rest day
            </span>
          </div>
        </Panel>
        <Panel
          title="A nudge, not a judgment"
          subtitle="Explainable adherence estimate"
        >
          <div className="risk-overview">
            <Ring
              value={s.habits.risk}
              label={s.habits.coldStart ? "—" : String(s.habits.risk)}
              sub="skip-risk index"
              color={s.habits.risk >= 60 ? "#cd865e" : "#aaa0ce"}
            />
            <div>
              <h3>{s.habits.label}</h3>
              <p>
                {s.habits.coldStart
                  ? "Your baseline grows as you complete scheduled sessions."
                  : "This index combines missed sessions, time since training, recent consistency, and explicit low-energy language."}
              </p>
            </div>
          </div>
          <ul className="reason-list">
            {s.habits.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <p className="quiet-note">
            A rule-based index, not a trained probability or diagnosis. Rest
            days do not break your streak.
          </p>
          <Submit
            busy={busy}
            variant="outline"
            onClick={() =>
              act(
                "schedule/adapt",
                "POST",
                {},
                "Your schedule has been adjusted with recovery time.",
              )
            }
          >
            <RotateCcw size={16} />
            Adapt a missed session
          </Submit>
        </Panel>
      </div>
      <Panel
        title="Make room for your next session"
        subtitle={`All times in ${s.profile.timezone}`}
        action={
          <Button
            variant="outline"
            onClick={calendar}
            disabled={!future.length}
          >
            <Download size={16} />
            Add to calendar
          </Button>
        }
      >
        {future.length ? (
          <div className="schedule-list">
            {future.slice(0, 12).map((x) => (
              <div className="schedule-row" key={x.id}>
                <div className="date-tile">
                  <small>
                    {new Date(x.date + "T12:00:00Z").toLocaleDateString(
                      "en-GB",
                      { month: "short" },
                    )}
                  </small>
                  <strong>
                    {new Date(x.date + "T12:00:00Z").getUTCDate()}
                  </strong>
                </div>
                <div className="schedule-info">
                  <h3>{x.title}</h3>
                  <p>
                    {new Date(x.date + "T12:00:00Z").toLocaleDateString(
                      "en-GB",
                      { weekday: "long" },
                    )}{" "}
                    · {x.time}
                  </p>
                </div>
                <Badge tone={x.status === "completed" ? "mint" : "neutral"}>
                  {x.status}
                </Badge>
                {x.status !== "completed" && (
                  <div className="button-row">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setMoving(x.id);
                        setDate(x.date);
                        setOpen(true);
                      }}
                    >
                      Reschedule
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() =>
                        act(
                          "schedule/" + x.id,
                          "PATCH",
                          {
                            status:
                              x.status === "skipped" ? "scheduled" : "skipped",
                          },
                          x.status === "skipped"
                            ? "Session restored."
                            : "Session marked as skipped.",
                        )
                      }
                    >
                      {x.status === "skipped" ? "Restore" : "Skip"}
                    </Button>
                    {x.date === s.today && x.status === "scheduled" && (
                      <Button onClick={() => navigate("trainer")}>
                        Start
                        <ArrowRight size={15} />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <Empty
            title="Start with one manageable session"
            body="Choose a plan or schedule your first workout."
            action={
              <Button onClick={() => navigate("discover")}>Find my plan</Button>
            }
          />
        )}
        <p className="quiet-note">
          Reminders appear in the app when you visit. Calendar export includes a
          15-minute reminder; your calendar application manages delivery. No
          background push service is claimed.
        </p>
      </Panel>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {moving ? "Move your session" : "Make time for a workout"}
            </DialogTitle>
            <DialogDescription>
              {moving
                ? "Choose a free day with room to recover."
                : "One planned session per day helps you keep a manageable rhythm."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save}>
            <Field label="Date">
              <Input
                type="date"
                value={date}
                min={s.today}
                max={shiftDate(s.today, 180)}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </Field>
            {!moving && (
              <>
                <Field label="Time">
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                  />
                </Field>
                <Field label="Session title">
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    minLength={2}
                    maxLength={80}
                    required
                  />
                </Field>
              </>
            )}
            <Submit type="submit" busy={busy} className="full-width">
              {moving ? "Move session" : "Save session"}
            </Submit>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
