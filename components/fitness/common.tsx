"use client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { Snapshot } from "@/lib/types";
import { ArrowUpRight, Info, Loader2 } from "lucide-react";
import React, { createContext, useContext, useId } from "react";
export type FitnessContextValue = {
  s: Snapshot;
  reload: () => Promise<void>;
  navigate: (view: string) => void;
  act: <T = any>(
    path: string,
    method?: string,
    data?: unknown,
    message?: string,
  ) => Promise<T | undefined>;
  busy: boolean;
  logout: () => Promise<void>;
};
export const FitnessContext = createContext<FitnessContextValue | null>(null);
export function useFitness() {
  const c = useContext(FitnessContext);
  if (!c) throw new Error("Fitness context is unavailable");
  return c;
}
export function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark">F</span>
      <span>
        FORM<span className="brand-period">.</span>
      </span>
    </span>
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <div className="panel-heading">
          <div>
            <h2>{title}</h2>
            {subtitle && <p className="muted small">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactElement<{ id?: string; "aria-describedby"?: string }>;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {React.cloneElement(children, {
        id,
        ...(hint ? { "aria-describedby": id + "-hint" } : {}),
      })}
      {hint && (
        <p id={id + "-hint"} className="field-hint">
          {hint}
        </p>
      )}
    </div>
  );
}
export function Choice({
  value,
  onChange,
  options,
  id,
  disabled,
  ...rest
}: {
  value: string;
  onChange: (value: string) => void;
  options: (string | { value: string; label: string })[];
  id?: string;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger id={id} className="choice" {...rest}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => {
          const item = typeof o === "string" ? { value: o, label: o } : o;
          return (
            <SelectItem value={item.value} key={item.value}>
              {item.label}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
export function Ring({
  value,
  max = 100,
  size = 116,
  label,
  sub,
  color = "var(--lime)",
}: {
  value: number;
  max?: number;
  size?: number;
  label?: string;
  sub?: string;
  color?: string;
}) {
  const percentage = Math.min(
    100,
    Math.max(0, (value / Math.max(1, max)) * 100),
  );
  return (
    <div
      className="metric-ring"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label ?? value}: ${Math.round(percentage)} percent`}
    >
      <svg viewBox="0 0 120 120">
        <circle
          className="ring-track"
          cx="60"
          cy="60"
          r="51"
          fill="none"
          strokeWidth="9"
        />
        <circle
          cx="60"
          cy="60"
          r="51"
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${percentage * 3.2044} 320.44`}
          transform="rotate(-90 60 60)"
        />
      </svg>
      <div>
        <strong>{label ?? value}</strong>
        {sub && <span>{sub}</span>}
      </div>
    </div>
  );
}
export function Metric({
  icon: Icon,
  label,
  value,
  unit,
  detail,
  color = "lime",
}: {
  icon: React.ComponentType<any>;
  label: string;
  value: React.ReactNode;
  unit?: string;
  detail?: string;
  color?: string;
}) {
  return (
    <div className="metric">
      <div className="metric-top">
        <span>{label}</span>
        <span className={`icon-tile ${color}`}>
          <Icon size={19} />
        </span>
      </div>
      <div className="metric-value">
        {value}
        <span>{unit}</span>
      </div>
      {detail && <p className="small muted">{detail}</p>}
    </div>
  );
}
export function Macro({
  label,
  value,
  target,
  color = "lime",
  unit = "g",
}: {
  label: string;
  value: number;
  target: number | null;
  color?: string;
  unit?: string;
}) {
  return (
    <div className={`macro ${color}`}>
      <div>
        <span>{label}</span>
        <span>
          <strong>{Math.round(value)}</strong>
          <span className="muted">
            {" "}
            / {target ?? "—"} {unit}
          </span>
        </span>
      </div>
      <Progress
        value={target ? Math.min((value / target) * 100, 100) : 0}
        aria-label={`${label}: ${value} of ${target ?? "no"} ${unit}`}
      />
    </div>
  );
}
export function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <Info size={26} />
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}
export function Loading() {
  return (
    <div
      className="page-loading"
      role="status"
      aria-label="Loading your fitness workspace"
    >
      <Skeleton className="h-12 w-64" />
      <div className="grid-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}
export function Submit({
  children,
  busy,
  ...props
}: React.ComponentProps<typeof Button> & { busy?: boolean }) {
  return (
    <Button {...props} disabled={busy || props.disabled}>
      {busy && <Loader2 className="spin" size={16} />} {children}
    </Button>
  );
}
export function Confirm({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="danger-button">
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
export function LinkButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" className="text-link" onClick={onClick}>
      {children}
      <ArrowUpRight size={16} />
    </button>
  );
}
export const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
export const goalLabel = (x: string) =>
  ({
    fitness: "Everyday fitness",
    strength: "Build strength",
    muscle: "Build muscle",
    fat_loss: "Sustainable fat loss",
  })[x] ?? x;
