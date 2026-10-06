"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { ApiClientError, api, download } from "@/lib/api";
import type { Snapshot, User } from "@/lib/types";
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChartNoAxesCombined,
  Compass,
  Dumbbell,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Radio,
  RefreshCw,
  ScanLine,
  Settings,
  ShieldCheck,
  UtensilsCrossed,
} from "lucide-react";
import React, { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { Toaster, toast } from "sonner";
import Auth from "./fitness/auth";
import { Brand, Empty, FitnessContext, Loading } from "./fitness/common";
import Dashboard from "./fitness/dashboard";
const Workouts = lazy(() => import("./fitness/workouts"));
const Trainer = lazy(() => import("./fitness/trainer"));
const Nutrition = lazy(() => import("./fitness/nutrition"));
const Habits = lazy(() => import("./fitness/habits"));
const Analytics = lazy(() => import("./fitness/analytics"));
const Buddy = lazy(() => import("./fitness/buddy"));
const Discover = lazy(() => import("./fitness/discover"));
const Equipment = lazy(() => import("./fitness/equipment"));
const SettingsPage = lazy(() => import("./fitness/settings"));
const Profile = lazy(() => import("./fitness/profile"));
const Admin = lazy(() => import("./fitness/admin"));
const Notifications = lazy(() => import("./fitness/notifications"));
const links = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard },
  { id: "workouts", label: "My workouts", icon: Dumbbell },
  { id: "trainer", label: "Live trainer", icon: ScanLine },
  { id: "nutrition", label: "Nutrition", icon: UtensilsCrossed },
  { id: "habits", label: "Habits & schedule", icon: CalendarDays },
  { id: "analytics", label: "My progress", icon: ChartNoAxesCombined },
  { id: "buddy", label: "Gym buddy", icon: MessageCircle },
  { id: "discover", label: "Discover", icon: Compass },
  { id: "equipment", label: "Smart equipment", icon: Radio },
];
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <Empty
        title="This view needs a fresh start"
        body="Your saved data is safe. Reload the page to try again."
        action={<Button onClick={() => location.reload()}>Reload page</Button>}
      />
    ) : (
      this.props.children
    );
  }
}
function Navigation({
  view,
  navigate,
  s,
  logout,
}: {
  view: string;
  navigate: (v: string) => void;
  s: Snapshot;
  logout: () => void;
}) {
  const { setOpenMobile } = useSidebar();
  const go = (id: string) => {
    navigate(id);
    setOpenMobile(false);
  };
  return (
    <Sidebar className="form-sidebar">
      <SidebarHeader>
        <button
          className="sidebar-brand"
          onClick={() => go("dashboard")}
          aria-label="Go to overview"
        >
          <Brand />
        </button>
        <p className="sidebar-subtitle">YOUR PERSONAL FITNESS SPACE</p>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>YOUR WORKSPACE</SidebarGroupLabel>
          <SidebarMenu>
            {links.map((l) => (
              <SidebarMenuItem key={l.id}>
                <SidebarMenuButton
                  isActive={view === l.id}
                  onClick={() => go(l.id)}
                  tooltip={l.label}
                  className="nav-button"
                >
                  <l.icon />
                  <span>{l.label}</span>
                  {l.id === "trainer" && <span className="nav-new">LIVE</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup className="sidebar-extra">
          <SidebarGroupLabel>ACCOUNT</SidebarGroupLabel>
          <SidebarMenu>
            {[
              { id: "settings", label: "Settings", icon: Settings },
              ...(s.user.role === "admin"
                ? [{ id: "admin", label: "Admin studio", icon: ShieldCheck }]
                : []),
            ].map((l) => (
              <SidebarMenuItem key={l.id}>
                <SidebarMenuButton
                  isActive={view === l.id}
                  onClick={() => go(l.id)}
                  className="nav-button"
                >
                  <l.icon />
                  <span>{l.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
        <div className="sidebar-coach">
          <div>
            <MessageCircle size={19} />
            <span>A little guidance?</span>
          </div>
          <p>
            Make today’s next step
            <br />a little easier.
          </p>
          <button onClick={() => go("buddy")}>
            Talk to your buddy
            <ArrowUpRight size={16} />
          </button>
        </div>
      </SidebarContent>
      <SidebarFooter>
        <button className="sidebar-user" onClick={() => go("profile")}>
          <span className="avatar">
            {s.user.name
              .split(" ")
              .map((x) => x[0])
              .slice(0, 2)
              .join("")}
          </span>
          <span>
            <strong>{s.user.name}</strong>
            <small>
              {s.user.demo ? "Demo workspace" : "Personal workspace"}
            </small>
          </span>
        </button>
        <button onClick={logout} className="signout" aria-label="Sign out">
          <LogOut size={17} />
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
export default function FitnessApp() {
  const [view, setView] = useState(() =>
      typeof window === "undefined"
        ? "home"
        : window.location.pathname.split("/")[1] || "home",
    ),
    [user, setUser] = useState<User | null>(null),
    [s, setSnapshot] = useState<Snapshot | null>(null),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState(""),
    [busy, setBusy] = useState(false),
    [recovery, setRecovery] = useState("");
  const navigate = useCallback((v: string) => {
    setView(v.split("?")[0]);
    window.history.pushState({}, "", v === "home" ? "/" : "/" + v);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);
  const reload = useCallback(async () => {
    const data = await api<Snapshot>("snapshot");
    setSnapshot(data);
    setUser(data.user);
    setLoadError("");
  }, []);
  useEffect(() => {
    const route = window.location.pathname.split("/")[1] || "home";
    const pop = () => setView(window.location.pathname.split("/")[1] || "home");
    window.addEventListener("popstate", pop);
    api<{ user: User }>("auth/me")
      .then(async (r) => {
        setUser(r.user);
        await reload();
        if (["home", "login", "signup"].includes(route)) navigate("dashboard");
      })
      .catch((e) => {
        if (!(e instanceof ApiClientError && e.status === 401))
          setLoadError(e.message);
      })
      .finally(() => setLoading(false));
    return () => window.removeEventListener("popstate", pop);
  }, [reload, navigate]);
  const logout = useCallback(async () => {
    try {
      await api("auth/logout", "POST", {});
      setUser(null);
      setSnapshot(null);
      navigate("home");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [navigate]);
  const act = useCallback(
    async <T,>(
      path: string,
      method = "POST",
      data?: unknown,
      message?: string,
    ): Promise<T | undefined> => {
      setBusy(true);
      try {
        const result = await api<T>(path, method, data);
        await reload();
        if (message) toast.success(message);
        return result;
      } catch (e) {
        toast.error((e as Error).message);
        if (e instanceof ApiClientError && e.status === 401) {
          setUser(null);
          setSnapshot(null);
          navigate("login");
        }
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [reload, navigate],
  );
  async function onAuthenticated(u: User, key?: string) {
    setUser(u);
    setLoading(true);
    if (key) setRecovery(key);
    try {
      const data = await api<Snapshot>("snapshot");
      setSnapshot(data);
      navigate(data.profile.onboarded ? "dashboard" : "onboarding");
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  const hasSnapshot = !!s,
    userId = user?.id;
  useEffect(() => {
    if (!hasSnapshot) return;
    const registry = (document as Document & { modelContext?: any })
      .modelContext;
    if (!registry?.registerTool) return;
    const life = new AbortController();
    Promise.resolve(
      registry.registerTool(
        {
          name: "form_navigate",
          title: "Open a fitness workspace page",
          description:
            "Navigate to a named page in the current authenticated fitness workspace. Does not start a camera or create a workout.",
          inputSchema: {
            type: "object",
            properties: {
              page: { type: "string", enum: links.map((x) => x.id) },
            },
            required: ["page"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute: (input: unknown) => {
            const page = (input as { page?: string })?.page;
            if (!links.some((x) => x.id === page))
              throw new Error("Unknown fitness page");
            navigate(page!);
            return { page };
          },
        },
        { signal: life.signal },
      ),
    ).catch(() => {});
    return () => life.abort();
  }, [hasSnapshot, navigate]);
  useEffect(() => {
    if (!userId) return;
    const timer = setInterval(
      () => {
        api("auth/refresh", "POST", {}).catch(() => {});
      },
      30 * 60 * 1000,
    );
    return () => clearInterval(timer);
  }, [userId]);
  let content: React.ReactNode;
  if (loading)
    content = (
      <div className="boot-screen">
        <Brand />
        <Loading />
      </div>
    );
  else if (loadError && !s)
    content = (
      <div className="boot-screen">
        <Brand />
        <Empty
          title="Your workspace could not load"
          body={loadError}
          action={
            <Button onClick={() => location.reload()}>
              <RefreshCw size={16} />
              Try again
            </Button>
          }
        />
      </div>
    );
  else if (!user || !s)
    content = (
      <Auth view={view} navigate={navigate} onAuthenticated={onAuthenticated} />
    );
  else {
    const Page =
      (
        {
          workouts: Workouts,
          trainer: Trainer,
          nutrition: Nutrition,
          habits: Habits,
          analytics: Analytics,
          buddy: Buddy,
          discover: Discover,
          equipment: Equipment,
          settings: SettingsPage,
          profile: Profile,
          onboarding: Profile,
          admin: Admin,
          notifications: Notifications,
        } as Record<string, React.ComponentType>
      )[view] ?? Dashboard;
    content = (
      <FitnessContext.Provider
        value={{ s, reload, navigate, act, busy, logout }}
      >
        <SidebarProvider
          style={{ "--sidebar-width": "15.5rem" } as React.CSSProperties}
        >
          <a className="skip-link" href="#main-content">
            Skip to content
          </a>
          <Navigation view={view} navigate={navigate} s={s} logout={logout} />
          <SidebarInset className="workspace">
            <header className="workspace-header">
              <div>
                <SidebarTrigger className="mobile-menu" />
                <span className="breadcrumb">
                  My workspace <span>/</span>{" "}
                  <strong>
                    {links.find((l) => l.id === view)?.label ??
                      (view === "admin"
                        ? "Admin studio"
                        : view === "notifications"
                          ? "Notifications"
                          : view === "onboarding"
                            ? "Welcome"
                            : "Your account")}
                  </strong>
                </span>
              </div>
              <div className="header-actions">
                <span className="header-date">
                  {new Date(s.today + "T12:00:00Z").toLocaleDateString(
                    "en-GB",
                    { weekday: "short", day: "numeric", month: "short" },
                  )}
                </span>
                <button
                  className="notification-button"
                  onClick={() => navigate("notifications")}
                  aria-label={`Notifications, ${s.notifications.filter((n) => !n.read_at).length} unread`}
                >
                  <Bell size={20} />
                  {s.notifications.some((n) => !n.read_at) && <span />}
                </button>
                <button
                  className="avatar small-avatar"
                  onClick={() => navigate("profile")}
                  aria-label="Your profile"
                >
                  {s.user.name.slice(0, 1)}
                </button>
              </div>
            </header>
            {s.user.demo === 1 && (
              <div className="demo-banner">
                <span>
                  <span className="sample-dot" />{" "}
                  {s.user.role === "admin"
                    ? "Isolated admin demo"
                    : "Demo workspace"}{" "}
                  · Sample history is labelled. Your changes are private to this
                  workspace.
                </span>
                <button onClick={logout}>Exit demo</button>
              </div>
            )}
            <main id="main-content" className="main-content" tabIndex={-1}>
              <ErrorBoundary key={view}>
                <Suspense fallback={<Loading />}>
                  <Page />
                </Suspense>
              </ErrorBoundary>
            </main>
            <footer className="workspace-footer">
              <span>FORM · Built around your progress</span>
              <span>Camera stays local. Your data stays yours.</span>
            </footer>
          </SidebarInset>
        </SidebarProvider>
      </FitnessContext.Provider>
    );
  }
  return (
    <>
      {content}
      <Toaster position="bottom-right" richColors closeButton />
      <Dialog
        open={!!recovery}
        onOpenChange={(open) => {
          if (!open) setRecovery("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save your account recovery key</DialogTitle>
            <DialogDescription>
              This private key can reset your password. It is shown only once.
              Keep the downloaded file somewhere safe.
            </DialogDescription>
          </DialogHeader>
          <Button
            onClick={() =>
              download(
                "FORM-recovery-key.txt",
                `Account: ${user?.email}\nRecovery key: ${recovery}\nKeep this private.\n`,
                "text/plain",
              )
            }
          >
            Download recovery key
          </Button>
          <Button variant="outline" onClick={() => setRecovery("")}>
            I’ve saved my key
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
