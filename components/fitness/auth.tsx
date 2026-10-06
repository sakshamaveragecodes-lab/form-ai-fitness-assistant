"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, download } from "@/lib/api";
import type { User } from "@/lib/types";
import {
  Activity,
  ArrowRight,
  Check,
  ChevronLeft,
  Dumbbell,
  Flame,
  KeyRound,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { Badge, Brand, Field, Ring, Submit } from "./common";
export default function Auth({
  view,
  navigate,
  onAuthenticated,
}: {
  view: string;
  navigate: (v: string) => void;
  onAuthenticated: (u: User, recovery?: string) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [key, setKey] = useState(""),
    [resetKey, setResetKey] = useState("");
  const landing = view === "home" || view === "";
  const register = view === "signup",
    reset = view === "reset";
  async function demo(admin = false) {
    setBusy(true);
    setError("");
    try {
      const r = await api("auth/demo", "POST", { admin });
      onAuthenticated(r.user);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await api(
        "auth/" + (reset ? "reset" : register ? "register" : "login"),
        "POST",
        reset
          ? { email, password, recoveryKey: key }
          : register
            ? { name, email, password }
            : { email, password },
      );
      if (reset) {
        setResetKey(r.recoveryKey);
      } else onAuthenticated(r.user, r.recoveryKey);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-site">
      <header className="landing-nav">
        <button onClick={() => navigate("home")} aria-label="FORM home">
          <Brand />
        </button>
        <div>
          <Button variant="ghost" onClick={() => navigate("login")}>
            Sign in
          </Button>
          <Button onClick={() => navigate("signup")}>
            Create account
            <ArrowRight size={16} />
          </Button>
        </div>
      </header>
      {landing ? (
        <main className="landing-main">
          <div className="landing-copy">
            <Badge tone="lime">Your effort. A clearer picture.</Badge>
            <h1>
              Good form.
              <br />
              Better habits.
              <br />
              <span>A stronger you.</span>
            </h1>
            <p>
              Meet your everyday fitness companion. Train with live feedback,
              make meals simpler, and see the progress behind your effort.
            </p>
            <div className="button-row">
              <Submit
                busy={busy}
                onClick={() => demo()}
                className="btn-lime large"
              >
                Explore the demo
                <ArrowRight size={18} />
              </Submit>
              <Button
                variant="outline"
                className="large"
                onClick={() => navigate("signup")}
              >
                Start your journey
              </Button>
            </div>
            <p className="small landing-note">
              <ShieldCheck size={16} />
              Camera analysis stays on your device.
            </p>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="landing-features">
              <span>
                <ScanLine />
                Live form coaching
              </span>
              <span>
                <Flame />
                Nutrition that fits
              </span>
              <span>
                <Activity />
                Progress you can see
              </span>
            </div>
          </div>
          <div className="landing-demo">
            <div className="demo-top">
              <span className="eyebrow">A DAY WITH FORM</span>
              <Badge>Sample activity</Badge>
            </div>
            <div className="sample-head">
              <div>
                <p>YOUR NEXT SESSION</p>
                <h2>
                  Build your
                  <br />
                  foundation.
                </h2>
              </div>
              <span className="icon-tile lime">
                <Dumbbell />
              </span>
            </div>
            <div className="sample-stats">
              <span>
                <strong>25</strong> minutes
              </span>
              <span>
                <strong>4</strong> exercises
              </span>
              <span>
                <strong>3</strong> sets
              </span>
            </div>
            <div className="demo-score">
              <Ring value={86} label="86" sub="form score" size={145} />
              <div>
                <h3>
                  More control.
                  <br />
                  Every rep.
                </h3>
                <p>Understand your range, tempo, and consistency.</p>
              </div>
            </div>
            <div className="sample-task">
              <Check size={18} />
              <span>Train with purpose. Recover with confidence.</span>
            </div>
          </div>
          <div className="landing-bottom">
            <span>AI Gym & Fitness Assistant · Seven connected modules</span>
            <button
              className="text-link"
              onClick={() => demo(true)}
              disabled={busy}
            >
              Explore admin sandbox
              <ArrowRight size={15} />
            </button>
          </div>
        </main>
      ) : (
        <main className="auth-layout">
          <aside className="auth-story">
            <Badge tone="lime">MAKE ROOM FOR PROGRESS</Badge>
            <h1>
              Your next chapter
              <br />
              starts with
              <br />
              <span>one good rep.</span>
            </h1>
            <p>
              A private space for your workouts, meals, and the habits that
              connect them.
            </p>
            <div className="auth-promises">
              <p>
                <Check />
                Your camera stays private.
              </p>
              <p>
                <Check />
                Your progress stays yours.
              </p>
              <p>
                <Check />
                Every recommendation has a reason.
              </p>
            </div>
          </aside>
          <section className="auth-form">
            <button className="text-link" onClick={() => navigate("home")}>
              <ChevronLeft size={16} />
              Back to home
            </button>
            <h2>
              {reset
                ? "Recover your account"
                : register
                  ? "Let’s get you moving."
                  : "Welcome back."}
            </h2>
            <p className="muted">
              {reset
                ? "Use the recovery key saved when you created your account."
                : register
                  ? "Create your private fitness workspace. For adults 18+."
                  : "Your next good session is waiting for you."}
            </p>
            {resetKey ? (
              <div className="recovery-box">
                <KeyRound />
                <h3>Password updated</h3>
                <p>
                  Your old recovery key no longer works. Save the new one
                  securely.
                </p>
                <Button
                  onClick={() =>
                    download(
                      "FORM-recovery-key.txt",
                      `Account: ${email}\nRecovery key: ${resetKey}\nKeep this private. It can reset your account password.\n`,
                      "text/plain",
                    )
                  }
                >
                  Download new recovery key
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setResetKey("");
                    navigate("login");
                  }}
                >
                  Continue to sign in
                </Button>
              </div>
            ) : (
              <form onSubmit={submit}>
                {register && (
                  <Field label="Your name">
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                      minLength={2}
                      maxLength={80}
                      required
                    />
                  </Field>
                )}
                <Field label="Email address">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    maxLength={254}
                    required
                  />
                </Field>
                {reset && (
                  <Field
                    label="Recovery key"
                    hint="The 64-character key from your downloaded recovery file."
                  >
                    <Input
                      value={key}
                      onChange={(e) => setKey(e.target.value.trim())}
                      minLength={64}
                      maxLength={64}
                      autoComplete="off"
                      required
                    />
                  </Field>
                )}
                <Field
                  label={reset ? "New password" : "Password"}
                  hint={
                    register || reset
                      ? "Use at least 12 characters. A long passphrase works well."
                      : undefined
                  }
                >
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={
                      register || reset ? "new-password" : "current-password"
                    }
                    minLength={register || reset ? 12 : 1}
                    maxLength={128}
                    required
                  />
                </Field>
                {error && (
                  <p className="form-error" role="alert">
                    {error}
                  </p>
                )}
                <Submit type="submit" busy={busy} className="full-width">
                  {reset
                    ? "Reset password"
                    : register
                      ? "Create account"
                      : "Sign in"}
                  <ArrowRight size={16} />
                </Submit>
              </form>
            )}
            {!reset && (
              <>
                <div className="auth-links">
                  {register ? (
                    <span>
                      Already have an account?{" "}
                      <button onClick={() => navigate("login")}>Sign in</button>
                    </span>
                  ) : (
                    <>
                      <button onClick={() => navigate("reset")}>
                        Forgot your password?
                      </button>
                      <button onClick={() => navigate("signup")}>
                        Create account
                      </button>
                    </>
                  )}
                </div>
                <div className="divider-label">
                  <span>or take a look around</span>
                </div>
                <Button
                  variant="outline"
                  className="full-width"
                  disabled={busy}
                  onClick={() => demo()}
                >
                  Open a personal demo
                </Button>
                <button
                  className="admin-demo-link"
                  disabled={busy}
                  onClick={() => demo(true)}
                >
                  Open an isolated admin demo
                </button>
              </>
            )}
            <p className="privacy-note">
              No hidden tracking. Export or delete your information in Settings.
              FORM supports fitness planning and does not diagnose or treat
              health conditions.
            </p>
          </section>
        </main>
      )}
    </div>
  );
}
