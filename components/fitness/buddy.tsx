"use client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Send, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Badge,
  Confirm,
  goalLabel,
  PageTitle,
  Panel,
  useFitness,
} from "./common";
export default function Buddy() {
  const { s, act, busy, navigate } = useFitness();
  const [message, setMessage] = useState(""),
    [clear, setClear] = useState(false),
    [pending, setPending] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [s.messages.length, pending]);
  async function send(text: string) {
    if (!text.trim() || busy) return;
    setPending(text);
    setMessage("");
    const result = await act("chat", "POST", { message: text });
    if (!result) setMessage(text);
    setPending("");
  }
  return (
    <>
      <PageTitle
        eyebrow="A LITTLE GUIDANCE GOES A LONG WAY"
        title="Meet your gym buddy."
        description="Plan a session, talk through a setback, or find your next small step."
        action={
          <Badge tone="lavender">
            <Sparkles size={14} />
            {s.providerAvailable && s.profile.llmConsent
              ? "External AI coach enabled"
              : "Guided coaching mode"}
          </Badge>
        }
      />
      <div className="buddy-layout">
        <Panel className="chat-panel">
          <div className="chat-header">
            <span className="buddy-icon">
              <Sparkles size={23} />
            </span>
            <div>
              <strong>FORM Buddy</strong>
              <p>
                {s.providerAvailable && s.profile.llmConsent
                  ? "Connected conversational coach"
                  : "Personalized rules · no external AI key needed"}
              </p>
            </div>
            <button
              className="icon-button"
              aria-label="Clear conversation"
              onClick={() => setClear(true)}
            >
              <Trash2 size={17} />
            </button>
          </div>
          <div
            className="chat-messages"
            role="log"
            aria-label="Conversation with gym buddy"
            aria-live="polite"
          >
            {!s.messages.length && (
              <div className="chat-welcome">
                <Sparkles size={34} />
                <h2>
                  Let’s make today
                  <br />
                  feel a little easier.
                </h2>
                <p>
                  What’s on your mind—training, meals, motivation, or recovery?
                </p>
                <div className="chat-suggestions">
                  {[
                    "Help me plan today’s workout",
                    "What should I eat today?",
                    "I’m tired and unmotivated",
                    "How is my progress?",
                  ].map((t) => (
                    <button key={t} onClick={() => send(t)}>
                      {t}
                      <ArrowRight size={15} />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {s.messages.map((m) => (
              <article key={m.id} className={`chat-message ${m.role}`}>
                <span className="message-author">
                  {m.role === "user" ? "You" : "FORM Buddy"}
                  {m.role === "assistant" && (
                    <small>
                      {m.mode === "llm"
                        ? "External AI"
                        : m.mode === "safety"
                          ? "Safety guidance"
                          : m.mode === "guided-fallback"
                            ? "Guided fallback"
                            : "Guided coach"}
                    </small>
                  )}
                </span>
                <p>{m.content}</p>
              </article>
            ))}
            {pending && (
              <>
                <article className="chat-message user">
                  <span className="message-author">You</span>
                  <p>{pending}</p>
                </article>
                <div className="typing" role="status">
                  <span />
                  <span />
                  <span />
                  <span className="sr-only">Your buddy is responding</span>
                </div>
              </>
            )}
            <div ref={end} />
          </div>
          <form
            className="chat-compose"
            onSubmit={(e) => {
              e.preventDefault();
              void send(message);
            }}
          >
            <label className="sr-only" htmlFor="buddy-message">
              Message your gym buddy
            </label>
            <Textarea
              id="buddy-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What would help you today?"
              maxLength={2000}
              rows={2}
              disabled={busy}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(message);
                }
              }}
            />
            <Button
              type="submit"
              disabled={busy || !message.trim()}
              aria-label="Send message"
            >
              <Send size={19} />
            </Button>
          </form>
          <p className="chat-footnote">
            Fitness guidance, not medical diagnosis. If you feel unwell or in
            pain, seek qualified help.
          </p>
        </Panel>
        <aside>
          <Panel title="A little context helps">
            <p className="eyebrow">YOUR FOCUS</p>
            <h3>{goalLabel(s.profile.goal)}</h3>
            <div className="context-details">
              <div>
                <span>Experience</span>
                <strong>{s.profile.experience}</strong>
              </div>
              <div>
                <span>Diet</span>
                <strong>{s.profile.diet}</strong>
              </div>
              <div>
                <span>Weekly rhythm</span>
                <strong>{s.profile.days.length} days</strong>
              </div>
              <div>
                <span>Current streak</span>
                <strong>{s.habits.streak} sessions</strong>
              </div>
            </div>
            <Button
              variant="outline"
              className="full-width"
              onClick={() => navigate("profile")}
            >
              Update my profile
            </Button>
          </Panel>
          <div className="privacy-card">
            <ShieldCheck />
            <div>
              <strong>A conversation you control.</strong>
              <p>
                Guided mode uses your profile and recent conversation. External
                AI is optional and requires consent in Settings. Camera video is
                never shared.
              </p>
            </div>
          </div>
          <Panel title="How you’re feeling matters">
            <p>
              Low-energy words can prompt gentler guidance. This is a simple
              language signal, not emotion recognition or a mental-health
              assessment.
            </p>
            <p className="quiet-note">
              You can clear this conversation at any time.
            </p>
          </Panel>
        </aside>
      </div>
      <Confirm
        open={clear}
        onOpenChange={setClear}
        title="Clear your conversation?"
        description="This permanently deletes your saved messages and conversation context."
        onConfirm={() => {
          void act("chat", "DELETE", undefined, "Conversation cleared.");
          setClear(false);
        }}
      />
    </>
  );
}
