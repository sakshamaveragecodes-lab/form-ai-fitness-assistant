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
import { Textarea } from "@/components/ui/textarea";
import { api, download } from "@/lib/api";
import {
  ArrowRight,
  Download,
  Flag,
  KeyRound,
  MessageCircle,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge, Field, PageTitle, Panel, Submit, useFitness } from "./common";
export default function Settings() {
  const { s, act, busy, navigate, logout } = useFitness();
  const [name, setName] = useState(s.user.name),
    [current, setCurrent] = useState(""),
    [password, setPassword] = useState(""),
    [key, setKey] = useState(""),
    [deleting, setDeleting] = useState(false),
    [confirmation, setConfirmation] = useState(""),
    [deletePassword, setDeletePassword] = useState(""),
    [report, setReport] = useState(false),
    [title, setTitle] = useState(""),
    [details, setDetails] = useState(""),
    [localBusy, setLocalBusy] = useState(false);
  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    const r = await act<{ recoveryKey: string }>(
      "auth/password",
      "POST",
      { currentPassword: current, password },
      "Password updated. Other sessions were signed out.",
    );
    if (r) {
      setKey(r.recoveryKey);
      setCurrent("");
      setPassword("");
    }
  }
  async function exportData() {
    setLocalBusy(true);
    try {
      const data = await api("account/export");
      download("FORM-personal-data.json", JSON.stringify(data, null, 2));
      toast.success("Your data export is ready.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLocalBusy(false);
    }
  }
  async function remove(e: React.FormEvent) {
    e.preventDefault();
    setLocalBusy(true);
    try {
      await api("account", "DELETE", {
        confirmation,
        password: deletePassword,
      });
      await logout();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLocalBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="YOUR SPACE, YOUR CHOICES"
        title="Settings & privacy"
        description="Control your account, data, notifications, and optional AI connection."
      />
      <div className="grid-2">
        <Panel title="Your account" action={<UserRound size={21} />}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void act(
                "account/name",
                "PUT",
                { name },
                "Your name is updated.",
              );
            }}
          >
            <Field label="Display name">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                minLength={2}
                maxLength={80}
                required
              />
            </Field>
            <Field label="Email">
              <Input value={s.user.email} readOnly />
            </Field>
            <Submit busy={busy} type="submit">
              Save name
            </Submit>
          </form>
          <Button
            variant="outline"
            className="full-width spaced"
            onClick={() => navigate("profile")}
          >
            Edit my fitness profile
            <ArrowRight size={16} />
          </Button>
        </Panel>
        <Panel
          title="Your coaching choices"
          action={<MessageCircle size={21} />}
        >
          <label className="switch-row">
            <span>
              <strong>In-app workout reminders</strong>
              <small>Show session prompts when you visit your workspace.</small>
            </span>
            <Switch
              checked={s.profile.reminders}
              disabled={busy}
              onCheckedChange={(reminders) =>
                act(
                  "profile",
                  "PUT",
                  { ...s.profile, reminders },
                  "Reminder preference updated.",
                )
              }
            />
          </label>
          <label className="switch-row">
            <span>
              <strong>Allow external AI coaching</strong>
              <small>
                Share your conversation and a minimal fitness summary with the
                configured provider.
              </small>
            </span>
            <Switch
              checked={s.profile.llmConsent}
              disabled={busy}
              onCheckedChange={(llmConsent) =>
                act(
                  "profile",
                  "PUT",
                  { ...s.profile, llmConsent },
                  "AI preference updated.",
                )
              }
            />
          </label>
          <Badge tone="lavender">
            {s.providerAvailable
              ? "External provider configured"
              : "Guided coach available · no external provider configured"}
          </Badge>
          <p className="quiet-note">
            Turning this on has no effect until a server-side provider is
            configured. It never sends camera frames. Turning it off returns to
            local guided responses; previously sent provider data is governed by
            that provider.
          </p>
        </Panel>
        <Panel title="Password & recovery" action={<KeyRound size={21} />}>
          {s.user.demo ? (
            <p className="muted">
              This is an isolated demo account with a generated, undisclosed
              password. Create a personal account from the home page to manage a
              password and recovery key.
            </p>
          ) : (
            <form onSubmit={changePassword}>
              <Field label="Current password">
                <Input
                  type="password"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  autoComplete="current-password"
                  maxLength={128}
                  required
                />
              </Field>
              <Field label="New password">
                <Input
                  type="password"
                  minLength={12}
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </Field>
              <Submit type="submit" busy={busy}>
                Change password
              </Submit>
            </form>
          )}
          <p className="quiet-note">
            Changing your password revokes other sessions and rotates your
            one-time recovery key.
          </p>
        </Panel>
        <Panel
          title="Your data belongs to you"
          action={<ShieldCheck size={21} />}
        >
          <p>
            Export your profile, workouts, nutrition diary, schedules, messages,
            and equipment readings.
          </p>
          <Button variant="outline" onClick={exportData} disabled={localBusy}>
            <Download size={16} />
            Export personal data
          </Button>
          <hr />
          <p>
            Camera video stays on your device. Fitness records are private to
            your account. No advertising trackers are installed.
          </p>
          <Button variant="ghost" onClick={() => setReport(true)}>
            <Flag size={16} />
            Report an issue
          </Button>
          <hr />
          <h3>Delete your account</h3>
          <p className="muted">
            This permanently deletes your workspace data. Download an export
            first if you want to keep a copy.
          </p>
          <Button
            variant="outline"
            className="danger-outline"
            onClick={() => setDeleting(true)}
          >
            <Trash2 size={16} />
            Delete account
          </Button>
        </Panel>
      </div>
      <Dialog open={!!key} onOpenChange={(open) => !open && setKey("")}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save your new recovery key</DialogTitle>
            <DialogDescription>
              Your previous key no longer works. This one is shown only now.
            </DialogDescription>
          </DialogHeader>
          <Button
            onClick={() =>
              download(
                "FORM-recovery-key.txt",
                `Account: ${s.user.email}\nRecovery key: ${key}\nKeep this private.\n`,
                "text/plain",
              )
            }
          >
            Download recovery key
          </Button>
          <Button variant="outline" onClick={() => setKey("")}>
            I’ve saved it
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={deleting} onOpenChange={setDeleting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permanently delete your account?</DialogTitle>
            <DialogDescription>
              Your fitness data and conversation will be deleted. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={remove}>
            <Field label="Type DELETE to confirm">
              <Input
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                pattern="DELETE"
                required
              />
            </Field>
            {!s.user.demo && (
              <Field label="Current password">
                <Input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  autoComplete="current-password"
                  maxLength={128}
                  required
                />
              </Field>
            )}
            <Submit
              type="submit"
              className="danger-button full-width"
              busy={localBusy}
              disabled={confirmation !== "DELETE"}
            >
              Delete my account permanently
            </Submit>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={report} onOpenChange={setReport}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report an issue</DialogTitle>
            <DialogDescription>
              Describe what happened. Do not include passwords, recovery keys,
              or device tokens.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const r = await act(
                "issues",
                "POST",
                { title, body: details },
                "Issue saved for your workspace administrator.",
              );
              if (r) {
                setReport(false);
                setTitle("");
                setDetails("");
              }
            }}
          >
            <Field label="Issue title">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                minLength={3}
                maxLength={100}
                required
              />
            </Field>
            <Field label="What happened?">
              <Textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                minLength={5}
                maxLength={1500}
                required
              />
            </Field>
            <Submit busy={busy} type="submit">
              Submit issue
            </Submit>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
