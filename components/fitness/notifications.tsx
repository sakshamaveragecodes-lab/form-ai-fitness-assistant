"use client";
import { Button } from "@/components/ui/button";
import { Bell, CalendarDays, CheckCheck } from "lucide-react";
import { Badge, Empty, PageTitle, Panel, useFitness } from "./common";
export default function Notifications() {
  const { s, act, busy } = useFitness();
  return (
    <>
      <PageTitle
        eyebrow="A HELPFUL HEADS-UP"
        title="Your notifications"
        description="Session reminders, gentle nudges, and workspace updates."
        action={
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              act(
                "notifications/read",
                "POST",
                {},
                "All notifications marked as read.",
              )
            }
          >
            <CheckCheck size={17} />
            Mark all as read
          </Button>
        }
      />
      <Panel>
        {s.notifications.length ? (
          <div className="notification-list">
            {s.notifications.map((n) => (
              <article key={n.id} className={n.read_at ? "read" : "unread"}>
                <span className="icon-tile lavender">
                  {n.kind === "reminder" ? (
                    <CalendarDays size={21} />
                  ) : (
                    <Bell size={21} />
                  )}
                </span>
                <div>
                  <div className="flex-between">
                    <h2>{n.title}</h2>
                    {!n.read_at && <Badge tone="lime">New</Badge>}
                  </div>
                  <p>{n.body}</p>
                  <small>
                    {new Date(n.created_at).toLocaleString("en-GB", {
                      timeZone: s.profile.timezone,
                    })}
                  </small>
                </div>
                {!n.read_at && (
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() =>
                      act("notifications/read", "POST", { id: n.id })
                    }
                  >
                    Mark read
                  </Button>
                )}
              </article>
            ))}
          </div>
        ) : (
          <Empty
            title="You’re all caught up"
            body="Session prompts and announcements will appear here."
          />
        )}
      </Panel>
    </>
  );
}
