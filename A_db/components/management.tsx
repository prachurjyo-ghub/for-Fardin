"use client";

import { MoreHorizontal } from "lucide-react";
import { Button, Dialog, DialogContent, DialogTrigger, Empty } from "./ui";
import { cn } from "@/lib/utils";

export function FormDialog({
  title,
  trigger,
  children,
}: {
  title: string;
  trigger: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={title}>{children}</DialogContent>
    </Dialog>
  );
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("panel p-5 md:p-6", className)}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight">{title}</h2>
          {description && (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ViewTabs<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (value: T) => void;
  items: Array<{ value: T; label: string; count?: number }>;
}) {
  return (
    <div
      className="mb-6 flex gap-1 overflow-x-auto rounded-xl border bg-muted/30 p-1"
      role="tablist"
    >
      {items.map((item) => (
        <button
          key={item.value}
          role="tab"
          aria-selected={value === item.value}
          onClick={() => onChange(item.value)}
          className={cn(
            "whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold transition",
            value === item.value
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {item.label}
          {item.count !== undefined && (
            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">
              {item.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function DetailGrid({
  items,
}: {
  items: Array<{ label: string; value: React.ReactNode }>;
}) {
  return (
    <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {item.label}
          </dt>
          <dd className="mt-1 break-words text-sm font-semibold">
            {item.value || "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function MoreActions({ children }: { children: React.ReactNode }) {
  return (
    <details className="relative">
      <summary className="list-none">
        <Button variant="secondary" size="sm" aria-label="More actions">
          <MoreHorizontal size={17} /> More actions
        </Button>
      </summary>
      <div className="absolute right-0 z-20 mt-2 grid w-[min(90vw,360px)] gap-3 rounded-xl border bg-card p-4 shadow-xl">
        {children}
      </div>
    </details>
  );
}

export function FriendlyEmpty({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed">
      <Empty title={title} detail={detail} />
      {action && (
        <div className="-mt-16 flex justify-center pb-8">{action}</div>
      )}
    </div>
  );
}
