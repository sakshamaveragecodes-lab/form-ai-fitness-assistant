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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { equipmentAdvice } from "@/lib/algorithms/recommendations";
import { api, download } from "@/lib/api";
import {
  Activity,
  Dumbbell,
  KeyRound,
  Play,
  Plus,
  ShieldCheck,
  Square,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Badge,
  Choice,
  Confirm,
  Empty,
  Field,
  Metric,
  PageTitle,
  Panel,
  Submit,
  useFitness,
} from "./common";
export default function Equipment() {
  const { s, act, busy, reload } = useFitness();
  const [open, setOpen] = useState(false),
    [name, setName] = useState(""),
    [exercise, setExercise] = useState("curl"),
    [mode, setMode] = useState("simulated"),
    [active, setActive] = useState(""),
    [token, setToken] = useState(""),
    [tokenDevice, setTokenDevice] = useState(""),
    [remove, setRemove] = useState(""),
    [selected, setSelected] = useState(""),
    [failure, setFailure] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const device = s.devices.find((x) => x.id === (selected || s.devices[0]?.id)),
    latest = device?.readings[0],
    advice = latest ? equipmentAdvice(latest, device?.readings[1]) : null;
  useEffect(() => {
    if (!active) return;
    let ended = false;
    async function tick() {
      try {
        await api("devices/" + active + "/simulate", "POST", {});
        if (!ended) await reload();
      } catch (e) {
        if (!ended) {
          setFailure((e as Error).message);
          setActive("");
        }
        return;
      }
      if (!ended) timer.current = setTimeout(tick, 4000);
    }
    void tick();
    return () => {
      ended = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [active, reload]);
  async function create(e: React.FormEvent) {
    e.preventDefault();
    const r = await act<{ id: string; deviceToken?: string }>(
      "devices",
      "POST",
      { name, exercise, mode },
      "Equipment added.",
    );
    if (r) {
      setOpen(false);
      setSelected(r.id);
      if (r.deviceToken) {
        setTokenDevice(r.id);
        setToken(r.deviceToken);
      }
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="CONNECTED EQUIPMENT, CLEARER INSIGHT"
        title="The smarter training floor."
        description="Explore realistic telemetry, or connect your own device through a secure bridge."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus size={17} />
            Add equipment
          </Button>
        }
      />
      <div className="equipment-layout">
        <aside>
          <Panel title="Your equipment">
            <div className="device-list">
              {s.devices.map((d) => (
                <button
                  key={d.id}
                  className={
                    (device?.id === d.id ? "selected " : "") + "device-choice"
                  }
                  onClick={() => setSelected(d.id)}
                >
                  <span className="icon-tile neutral">
                    <Dumbbell size={20} />
                  </span>
                  <span>
                    <strong>{d.name}</strong>
                    <small>
                      {d.mode === "simulated"
                        ? "Simulation device"
                        : "Hardware device"}{" "}
                      · {d.active ? "enabled" : "disabled"}
                    </small>
                  </span>
                </button>
              ))}
            </div>
            {!s.devices.length && (
              <Empty
                title="Connect your first device"
                body="Start with a simulator to see how telemetry works."
              />
            )}
          </Panel>
          <div className="privacy-card">
            <ShieldCheck />
            <div>
              <strong>Recommendations stay recommendations.</strong>
              <p>
                FORM never changes resistance on real hardware automatically.
                Check the equipment and confirm every adjustment yourself.
              </p>
            </div>
          </div>
        </aside>
        <div>
          {device ? (
            <>
              <Panel className="device-detail">
                <div className="flex-between">
                  <div>
                    <Badge
                      tone={device.mode === "simulated" ? "peach" : "mint"}
                    >
                      {device.mode === "simulated"
                        ? "SIMULATION MODE"
                        : "HARDWARE TELEMETRY"}
                    </Badge>
                    <h2>{device.name}</h2>
                    <p className="muted">
                      Exercise: {device.exercise} · ID:{" "}
                      <span className="device-id">{device.id}</span>
                    </p>
                  </div>
                  <label className="switch-row">
                    <span>Enabled</span>
                    <Switch
                      checked={!!device.active}
                      disabled={busy}
                      onCheckedChange={(v) => {
                        if (!v) setActive("");
                        void act(
                          "devices/" + device.id,
                          "PATCH",
                          { active: v },
                          v ? "Device enabled." : "Device disabled.",
                        );
                      }}
                    />
                  </label>
                </div>
                <div className="button-row">
                  {device.mode === "simulated" ? (
                    <Button
                      disabled={!device.active}
                      onClick={() => {
                        setFailure("");
                        setActive(active === device.id ? "" : device.id);
                      }}
                    >
                      {active === device.id ? (
                        <>
                          <Square size={16} />
                          Stop simulation
                        </>
                      ) : (
                        <>
                          <Play size={16} />
                          Start simulation
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={async () => {
                        const r = await act<{ deviceToken: string }>(
                          "devices/" + device.id + "/rotate",
                          "POST",
                          {},
                          "Device token rotated. Previous token revoked.",
                        );
                        if (r) {
                          setTokenDevice(device.id);
                          setToken(r.deviceToken);
                        }
                      }}
                    >
                      <KeyRound size={16} />
                      Rotate device token
                    </Button>
                  )}
                  <Button variant="ghost" onClick={() => setRemove(device.id)}>
                    <Trash2 size={16} />
                    Remove
                  </Button>
                </div>
                {device.mode === "simulated" && (
                  <p className="small muted">
                    Deterministic sample sets arrive every 4 seconds while this
                    page’s simulation is running. These readings are not real
                    sensor measurements.
                  </p>
                )}
                {failure && (
                  <p className="form-error" role="alert">
                    {failure}
                  </p>
                )}
              </Panel>
              <div className="grid-3">
                <Metric
                  icon={Dumbbell}
                  label="Resistance"
                  value={latest?.resistance ?? "—"}
                  unit="kg"
                />
                <Metric
                  icon={Activity}
                  label="Repetitions"
                  value={latest?.reps ?? "—"}
                  color="lavender"
                  detail={
                    latest
                      ? `${latest.duration} sec / set`
                      : "Waiting for a reading"
                  }
                />
                <Metric
                  icon={Activity}
                  label="Heart-rate input"
                  value={latest?.heart_rate ?? "—"}
                  unit="bpm"
                  color="peach"
                  detail={
                    device.mode === "simulated"
                      ? "Simulated value"
                      : "Optional sensor input; not a diagnosis"
                  }
                />
              </div>
              {advice ? (
                <Panel title="Make the next set count">
                  <div className="equipment-advice">
                    <div>
                      <span>Suggested resistance</span>
                      <strong>
                        {advice.resistance}
                        <small> kg</small>
                      </strong>
                    </div>
                    <div>
                      <span>Suggested rest</span>
                      <strong>
                        {advice.rest}
                        <small> sec</small>
                      </strong>
                    </div>
                    <div>
                      <span>Observed effort</span>
                      <strong>{advice.intensity}</strong>
                    </div>
                  </div>
                  <p>{advice.reason}</p>
                  {advice.warning && (
                    <p className="warning-box">{advice.warning}</p>
                  )}
                  <p className="quiet-note">
                    Advice uses effort (RPE), form input, and the previous set.
                    Hardware sensors must be calibrated. Stop if you feel
                    unwell.
                  </p>
                </Panel>
              ) : (
                <Panel>
                  <Empty
                    title="Ready for the first reading"
                    body={
                      device.mode === "simulated"
                        ? "Start the simulation to see sets, rest, and resistance suggestions."
                        : "Send telemetry through the provided MQTT bridge or authenticated HTTP ingestion endpoint."
                    }
                  />
                </Panel>
              )}
              <Panel
                title="Recent equipment sets"
                subtitle="Newest first · last 30 readings shown"
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sequence</TableHead>
                      <TableHead>Reps</TableHead>
                      <TableHead>Resistance</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>RPE</TableHead>
                      <TableHead>Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {device.readings.slice(0, 10).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>#{r.sequence}</TableCell>
                        <TableCell>{r.reps}</TableCell>
                        <TableCell>{r.resistance} kg</TableCell>
                        <TableCell>{r.duration}s</TableCell>
                        <TableCell>{r.rpe}/10</TableCell>
                        <TableCell>
                          <Badge>{r.source}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Panel>
            </>
          ) : (
            <Panel>
              <Empty
                title="No equipment selected"
                body="Add a simulated station or a real device to begin."
              />
            </Panel>
          )}
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add equipment</DialogTitle>
            <DialogDescription>
              Simulators need no hardware. Real devices receive a private
              ingestion token, shown once.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={create}>
            <Field label="Equipment name">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                minLength={2}
                maxLength={80}
                required
              />
            </Field>
            <Field label="Exercise">
              <Choice
                value={exercise}
                onChange={setExercise}
                options={s.catalog.exercises.map((x) => ({
                  value: x.data.slug,
                  label: x.name,
                }))}
              />
            </Field>
            <Field label="Connection mode">
              <Choice
                value={mode}
                onChange={setMode}
                options={[
                  {
                    value: "simulated",
                    label: "Simulation · no hardware required",
                  },
                  { value: "hardware", label: "Hardware · HTTP / MQTT bridge" },
                ]}
              />
            </Field>
            <Submit type="submit" busy={busy} className="full-width">
              Add equipment
            </Submit>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!token} onOpenChange={(open) => !open && setToken("")}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save your private device token</DialogTitle>
            <DialogDescription>
              This token is shown once. Anyone holding it can submit telemetry
              for this device. Keep it out of frontend code and shared reports.
            </DialogDescription>
          </DialogHeader>
          <Button
            onClick={() =>
              download(
                "FORM-device-credentials.txt",
                `Device: ${tokenDevice}\nToken: ${token}\nHTTP: POST /api/iot/ingest\nAuthorization: Device <token>\n`,
                "text/plain",
              )
            }
          >
            Download device credentials
          </Button>
          <Button variant="outline" onClick={() => setToken("")}>
            I’ve saved the token
          </Button>
        </DialogContent>
      </Dialog>
      <Confirm
        open={!!remove}
        onOpenChange={(v) => !v && setRemove("")}
        title="Remove this device?"
        description="Its credential and stored readings will be permanently deleted."
        onConfirm={() => {
          setActive("");
          void act("devices/" + remove, "DELETE", undefined, "Device removed.");
          setRemove("");
          setSelected("");
        }}
      />
    </>
  );
}
