"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Switch } from "@/components/ui/switch";
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
import { api } from "@/lib/api";
import type { CatalogItem, CatalogKind } from "@/lib/types";
import {
  Activity,
  Archive,
  Dumbbell,
  Pencil,
  Plus,
  Radio,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import CatalogEditor from "./catalog-editor";
import { UsageChart } from "./charts";
import {
  Badge,
  Choice,
  Confirm,
  Empty,
  Field,
  Loading,
  Metric,
  PageTitle,
  Panel,
  Submit,
  useFitness,
} from "./common";
export default function Admin() {
  const { s, act, busy } = useFitness();
  const [overview, setOverview] = useState<any>(null),
    [error, setError] = useState(""),
    [q, setQ] = useState(""),
    [status, setStatus] = useState("all"),
    [page, setPage] = useState(1),
    [users, setUsers] = useState<any>({ items: [], total: 0 }),
    [kind, setKind] = useState<CatalogKind>("exercises"),
    [items, setItems] = useState<CatalogItem[]>([]),
    [editing, setEditing] = useState<CatalogItem | null | undefined>(undefined),
    [confirm, setConfirm] = useState<{
      title: string;
      description: string;
      action: () => void;
    } | null>(null),
    [title, setTitle] = useState(""),
    [announcement, setAnnouncement] = useState("");
  useEffect(() => {
    if (s.user.role !== "admin") return;
    let live = true;
    api("admin/overview")
      .then((r) => {
        if (live) {
          setOverview(r);
          setError("");
        }
      })
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [s]);
  useEffect(() => {
    if (s.user.role !== "admin") return;
    let live = true;
    const timer = setTimeout(() => {
      api(
        `admin/users?q=${encodeURIComponent(q)}&status=${status === "all" ? "" : status}&page=${page}`,
      )
        .then((r) => live && setUsers(r))
        .catch((e) => live && toast.error(e.message));
    }, 180);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [q, status, page, s]);
  useEffect(() => {
    if (s.user.role !== "admin") return;
    let live = true;
    api("admin/catalog?kind=" + kind)
      .then((r) => live && setItems(r.items))
      .catch((e) => live && toast.error(e.message));
    return () => {
      live = false;
    };
  }, [kind, s]);
  if (s.user.role !== "admin")
    return (
      <Empty
        title="Administrator access required"
        body="Your account can access your own fitness workspace. Administration requires a separate authorized role."
      />
    );
  if (error)
    return (
      <Empty
        title="Admin data could not load"
        body={error}
        action={<Button onClick={() => location.reload()}>Retry</Button>}
      />
    );
  if (!overview) return <Loading />;
  return (
    <>
      <PageTitle
        eyebrow="THE WORKSPACE, AT A GLANCE"
        title="Admin studio"
        description="Manage your members, training content, equipment, and support."
        action={
          <Badge tone="lavender">
            <ShieldCheck size={15} />
            {s.user.demo
              ? "Isolated demo administrator"
              : "Workspace administrator"}
          </Badge>
        }
      />
      <div className="grid-4">
        <Metric
          icon={Users}
          label="Members"
          value={overview.users.length}
          detail={`${overview.users.filter((x: any) => x.status === "active").length} active`}
        />
        <Metric
          icon={Dumbbell}
          label="Stored sessions"
          value={overview.stats.sessions}
          detail="Within this workspace"
          color="lavender"
        />
        <Metric
          icon={Activity}
          label="Training minutes"
          value={Math.round(overview.stats.duration / 60)}
          detail={
            s.user.demo ? "Includes sample activity" : "Recorded activity"
          }
          color="peach"
        />
        <Metric
          icon={Radio}
          label="Equipment"
          value={overview.devices.length}
          detail={`${overview.devices.filter((d: any) => d.active).length} enabled`}
          color="mint"
        />
      </div>
      <Tabs defaultValue="overview">
        <TabsList className="section-tabs admin-tabs">
          {[
            "overview",
            "members",
            "content",
            "equipment",
            "issues",
            "announcements",
            "audit",
          ].map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {tab[0].toUpperCase() + tab.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="overview">
          <div className="grid-2">
            <Panel title="Training activity" subtitle="Stored workouts per day">
              <UsageChart data={overview.usage} />
            </Panel>
            <Panel title="Your content library">
              <div className="admin-content-summary">
                {overview.kinds.map((k: any) => (
                  <div key={k.kind}>
                    <span>{k.kind}</span>
                    <strong>{k.n}</strong>
                  </div>
                ))}
              </div>
              <p className="quiet-note">
                Every administrative change creates an audit entry. Access
                checks run on the server and include workspace ownership.
              </p>
            </Panel>
          </div>
        </TabsContent>
        <TabsContent value="members">
          <Panel
            title="Members"
            subtitle="Search, filter, and manage access. Roles are provisioned securely outside public registration."
          >
            <div className="table-toolbar">
              <Input
                aria-label="Search members"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by name or email…"
              />
              <Choice
                value={status}
                onChange={(v) => {
                  setStatus(v);
                  setPage(1);
                }}
                aria-label="Member status filter"
                options={[
                  { value: "all", label: "All statuses" },
                  { value: "active", label: "Active" },
                  { value: "suspended", label: "Suspended" },
                ]}
              />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Access</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.items.map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <strong>{u.name}</strong>
                      <p className="small muted break-email">{u.email}</p>
                    </TableCell>
                    <TableCell>
                      <Badge>{u.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge tone={u.status === "active" ? "mint" : "peach"}>
                        {u.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{u.created_at.slice(0, 10)}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        disabled={u.id === s.user.id || busy}
                        onClick={() =>
                          setConfirm({
                            title:
                              u.status === "active"
                                ? "Suspend this member?"
                                : "Restore member access?",
                            description:
                              u.status === "active"
                                ? "This signs out existing sessions and blocks new sign-ins. Their data remains stored."
                                : "The member will be able to sign in again.",
                            action: () =>
                              void act(
                                "admin/users/" + u.id,
                                "PATCH",
                                {
                                  status:
                                    u.status === "active"
                                      ? "suspended"
                                      : "active",
                                },
                                "Member access updated.",
                              ),
                          })
                        }
                      >
                        {u.id === s.user.id
                          ? "You"
                          : u.status === "active"
                            ? "Suspend"
                            : "Restore"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!users.items.length && (
              <p className="padded muted">No members match your search.</p>
            )}
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    aria-disabled={page <= 1}
                    onClick={(e) => {
                      e.preventDefault();
                      setPage(Math.max(1, page - 1));
                    }}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="page-count">
                    {page} / {Math.max(1, Math.ceil(users.total / 10))}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    aria-disabled={page * 10 >= users.total}
                    onClick={(e) => {
                      e.preventDefault();
                      setPage(
                        Math.min(
                          Math.max(1, Math.ceil(users.total / 10)),
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
        <TabsContent value="content">
          <Panel
            title="Manage the content library"
            subtitle="Create, edit, or archive workspace-specific records."
            action={
              <Button onClick={() => setEditing(null)}>
                <Plus size={16} />
                Add {kind.replace(/s$/, "")}
              </Button>
            }
          >
            <div className="table-toolbar">
              <Choice
                aria-label="Content type"
                value={kind}
                onChange={(v) => setKind(v as CatalogKind)}
                options={[
                  "exercises",
                  "plans",
                  "meals",
                  "challenges",
                  "gyms",
                  "content",
                ].map((value) => ({
                  value,
                  label:
                    value === "content"
                      ? "Coaching content"
                      : value[0].toUpperCase() + value.slice(1),
                }))}
              />
              <Badge>{items.length} records</Badge>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((x) => (
                  <TableRow key={x.id}>
                    <TableCell>
                      <strong>{x.name}</strong>
                    </TableCell>
                    <TableCell className="description-cell">
                      {x.description}
                    </TableCell>
                    <TableCell>
                      <Badge tone={x.active ? "mint" : "neutral"}>
                        {x.active ? "Active" : "Archived"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="button-row">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${x.name}`}
                          onClick={() => setEditing(x)}
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Archive ${x.name}`}
                          disabled={!x.active || busy}
                          onClick={() =>
                            setConfirm({
                              title: "Archive this content?",
                              description:
                                "It will disappear from new selections. Existing workout history is preserved.",
                              action: () =>
                                void act(
                                  "admin/catalog/" + x.id,
                                  "DELETE",
                                  undefined,
                                  "Content archived.",
                                ),
                            })
                          }
                        >
                          <Archive size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
        </TabsContent>
        <TabsContent value="equipment">
          <Panel
            title="Equipment records"
            subtitle="Tokens are never shown in administrative lists."
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Exercise</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Enabled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.devices.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.name}</TableCell>
                    <TableCell>{d.exercise}</TableCell>
                    <TableCell>
                      <Badge>{d.mode}</Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        aria-label={`Enable ${d.name}`}
                        checked={!!d.active}
                        disabled={busy}
                        onCheckedChange={(active) =>
                          act(
                            "admin/devices/" + d.id,
                            "PATCH",
                            { active },
                            "Device status updated.",
                          )
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
        </TabsContent>
        <TabsContent value="issues">
          <Panel
            title="Reported issues"
            subtitle="Resolve requests and keep a record of the action."
          >
            {overview.issues.length ? (
              overview.issues.map((issue: any) => (
                <div className="issue-row" key={issue.id}>
                  <div>
                    <Badge tone={issue.status === "open" ? "peach" : "mint"}>
                      {issue.status}
                    </Badge>
                    <h3>{issue.title}</h3>
                    <p>{issue.body}</p>
                    <small className="muted">
                      {issue.created_at.slice(0, 10)}
                    </small>
                  </div>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      act(
                        "admin/issues/" + issue.id,
                        "PATCH",
                        {
                          status: issue.status === "open" ? "resolved" : "open",
                        },
                        "Issue status updated.",
                      )
                    }
                  >
                    {issue.status === "open" ? "Resolve" : "Reopen"}
                  </Button>
                </div>
              ))
            ) : (
              <Empty
                title="No issues reported"
                body="Reports submitted from Settings will appear here."
              />
            )}
          </Panel>
        </TabsContent>
        <TabsContent value="announcements">
          <Panel
            title="Send a workspace announcement"
            subtitle="Delivered as an in-app notification to active members in this workspace."
          >
            <form
              className="announcement-form"
              onSubmit={(e) => {
                e.preventDefault();
                setConfirm({
                  title: "Send this announcement?",
                  description: `“${title}” will be delivered to ${overview.users.filter((u: any) => u.status === "active").length} active members in this workspace.`,
                  action: () => {
                    void act(
                      "admin/notifications",
                      "POST",
                      { title, body: announcement },
                      "Announcement delivered.",
                    );
                    setTitle("");
                    setAnnouncement("");
                  },
                });
              }}
            >
              <Field label="Title">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  minLength={2}
                  maxLength={100}
                  required
                />
              </Field>
              <Field label="Message">
                <Textarea
                  value={announcement}
                  onChange={(e) => setAnnouncement(e.target.value)}
                  minLength={3}
                  maxLength={1000}
                  rows={5}
                  required
                />
              </Field>
              <Submit type="submit" busy={busy}>
                <Send size={16} />
                Review announcement
              </Submit>
            </form>
          </Panel>
        </TabsContent>
        <TabsContent value="audit">
          <Panel
            title="Administrative audit trail"
            subtitle="Latest 50 actions. No passwords, tokens, or private chat content are recorded."
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Who</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.audits.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      {new Date(a.created_at).toLocaleString("en-GB", {
                        timeZone: s.profile.timezone,
                      })}
                    </TableCell>
                    <TableCell>{a.actor ?? "Deleted account"}</TableCell>
                    <TableCell>{a.action}</TableCell>
                    <TableCell className="audit-entity">{a.entity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!overview.audits.length && (
              <p className="padded muted">
                Your administrative actions will appear here.
              </p>
            )}
          </Panel>
        </TabsContent>
      </Tabs>
      {editing !== undefined && (
        <CatalogEditor
          item={editing}
          kind={kind}
          onClose={() => setEditing(undefined)}
        />
      )}
      <Confirm
        open={!!confirm}
        onOpenChange={(v) => !v && setConfirm(null)}
        title={confirm?.title ?? ""}
        description={confirm?.description ?? ""}
        onConfirm={() => {
          confirm?.action();
          setConfirm(null);
        }}
      />
    </>
  );
}
