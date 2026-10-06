"use client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { localDate, shiftDate } from "@/lib/algorithms/habits";
import { distanceKm, recommendPlans } from "@/lib/algorithms/recommendations";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Dumbbell,
  ExternalLink,
  MapPin,
  Navigation,
  Trophy,
} from "lucide-react";
import { useState } from "react";
import { Badge, Macro, PageTitle, Panel, Submit, useFitness } from "./common";
export default function Discover() {
  const { s, act, busy } = useFitness(),
    [location, setLocation] = useState<{ lat: number; lng: number } | null>(
      null,
    ),
    [locating, setLocating] = useState(false),
    [error, setError] = useState("");
  const plans = recommendPlans(s.catalog.plans, s.profile, s.workouts);
  const gyms = s.catalog.gyms
    .map((g) => ({
      ...g,
      distance: location
        ? distanceKm(location.lat, location.lng, g.data.lat, g.data.lng)
        : null,
    }))
    .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  function locate() {
    setError("");
    if (!navigator.geolocation) {
      setError(
        "Location is unavailable in this browser. You can still explore sample listings or open a maps search.",
      );
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocation({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLocating(false);
      },
      () => {
        setError(
          "Location was not available or permission was denied. It has not been saved.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }
  return (
    <>
      <PageTitle
        eyebrow="FIND WHAT FITS YOUR LIFE"
        title="Your next good fit."
        description="Training plans and challenges matched to your goals, experience, and equipment."
      />
      <Tabs defaultValue="plans">
        <TabsList className="section-tabs">
          <TabsTrigger value="plans">Workout plans</TabsTrigger>
          <TabsTrigger value="challenges">Challenges</TabsTrigger>
          <TabsTrigger value="gyms">Find a gym</TabsTrigger>
        </TabsList>
        <TabsContent value="plans">
          <div className="grid-2">
            {plans.map((p, i) => (
              <Panel key={p.id} className="plan-card">
                <div className="plan-card-top">
                  <span className={`icon-tile ${i % 2 ? "lavender" : "lime"}`}>
                    <Dumbbell size={24} />
                  </span>
                  <Badge tone={p.available ? "mint" : "neutral"}>
                    {p.match}% rule match
                  </Badge>
                </div>
                <h2>{p.name}</h2>
                <p className="muted">{p.description}</p>
                <div className="plan-facts">
                  <span>
                    <CalendarDays size={16} />
                    {p.data.days} days / week
                  </span>
                  <span>{p.data.minutes} min</span>
                  <span>{p.data.level}</span>
                </div>
                <div className="exercise-tags">
                  {p.data.exercises.map((slug: string) => (
                    <span key={slug}>
                      {s.catalog.exercises.find((x) => x.data.slug === slug)
                        ?.name ?? slug}
                    </span>
                  ))}
                </div>
                <p className="small muted">
                  {p.data.sets} sets × {p.data.reps} reps per movement (planks:
                  controlled timed holds).
                </p>
                <ul className="reason-list">
                  {p.reasons.map((reason: string) => (
                    <li key={reason}>
                      <Check size={15} />
                      {reason}
                    </li>
                  ))}
                </ul>
                {!p.available && (
                  <p className="warning-text">
                    Requires:{" "}
                    {p.data.equipment
                      .filter((e: string) => !s.profile.equipment.includes(e))
                      .join(", ")}
                    .
                  </p>
                )}
                <Submit
                  busy={busy}
                  disabled={!p.available}
                  className="full-width"
                  onClick={() =>
                    act(
                      "plans/adopt",
                      "POST",
                      { id: p.id },
                      `${p.name} added to your upcoming schedule.`,
                    )
                  }
                >
                  Make this my plan
                  <ArrowRight size={16} />
                </Submit>
              </Panel>
            ))}
          </div>
          <p className="quiet-note">
            Match = goal 35%, equipment 25%, experience 20%, schedule 10%,
            recent performance 10%. It is a transparent ranking rule, not a
            trained model’s confidence.
          </p>
        </TabsContent>
        <TabsContent value="challenges">
          <div className="grid-3">
            {s.catalog.challenges.map((c) => {
              const history = s.workouts.filter(
                  (w) =>
                    w.source !== "replay" &&
                    localDate(s.profile.timezone, new Date(w.performed_at)) >=
                      shiftDate(s.today, -c.data.days + 1),
                ),
                value =
                  c.data.metric === "minutes"
                    ? Math.round(
                        history.reduce((n, w) => n + w.duration / 60, 0),
                      )
                    : c.data.metric === "camera"
                      ? history.filter((w) => w.source === "camera").length
                      : history.length,
                joined = s.joined.includes(c.id);
              return (
                <Panel key={c.id} className="challenge-card">
                  <span className="icon-tile peach">
                    <Trophy size={26} />
                  </span>
                  <Badge>{c.data.days}-day window</Badge>
                  <h2>{c.name}</h2>
                  <p>{c.description}</p>
                  <Macro
                    label="Your progress"
                    value={value}
                    target={c.data.target}
                    unit={c.data.metric === "minutes" ? "min" : "sessions"}
                  />
                  <p className="small muted">
                    {s.user.demo
                      ? "Sample activity is included where relevant. "
                      : ""}
                    Rolling window, updated as you train.
                  </p>
                  <Submit
                    busy={busy}
                    variant={joined ? "outline" : "default"}
                    className="full-width"
                    disabled={joined}
                    onClick={() =>
                      act(
                        "challenges/join",
                        "POST",
                        { id: c.id },
                        "You’ve joined the challenge.",
                      )
                    }
                  >
                    <Trophy size={16} />
                    {joined
                      ? value >= c.data.target
                        ? c.data.reward
                        : "Challenge joined"
                      : "Join challenge"}
                  </Submit>
                </Panel>
              );
            })}
          </div>
        </TabsContent>
        <TabsContent value="gyms">
          <div className="gym-location">
            <div>
              <h2>A place to make progress.</h2>
              <p>
                Sample listings demonstrate filtering and distance ranking. They
                are not verified real businesses.
              </p>
            </div>
            <div className="button-row">
              <Submit busy={locating} variant="outline" onClick={locate}>
                <Navigation size={16} />
                Use my location
              </Submit>
              <Button asChild>
                <a
                  href={
                    location
                      ? `https://www.google.com/maps/search/gyms/@${location.lat},${location.lng},14z`
                      : "https://www.google.com/maps/search/gyms+near+me"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Search real gyms
                  <ExternalLink size={16} />
                </a>
              </Button>
            </div>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="grid-3">
            {gyms.map((g) => (
              <Panel key={g.id} className="gym-card">
                <span className="icon-tile lavender">
                  <MapPin size={24} />
                </span>
                <Badge tone="peach">
                  {g.data.demo ? "Demo listing" : "User-provided · unverified"}
                </Badge>
                <h2>{g.name}</h2>
                <p>{g.data.address}</p>
                {g.distance !== null && (
                  <strong className="gym-distance">
                    {g.distance} km <small>straight-line distance</small>
                  </strong>
                )}
                <div className="exercise-tags">
                  {g.data.equipment.map((e: string) => (
                    <span key={e}>{e}</span>
                  ))}
                </div>
                <p>{g.description}</p>
                <p className="small muted">
                  Illustrative fee: ₹{g.data.price}/month
                </p>
              </Panel>
            ))}
          </div>
          <p className="quiet-note">
            Location is requested only after you choose it, used in this page’s
            memory, and never saved to your account. Opening maps shares your
            search with that provider.
          </p>
        </TabsContent>
      </Tabs>
    </>
  );
}
