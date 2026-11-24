"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
export { Button, buttonVariants } from "./ui/button";
export { Input } from "./ui/input";
export { Skeleton } from "./ui/skeleton";
export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const styles = {
    neutral: "bg-muted text-muted-foreground",
    success: "bg-[var(--success-bg)] text-success",
    warning: "bg-[var(--warning-bg)] text-warning",
    danger: "bg-[var(--danger-bg)] text-danger",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-wide",
        styles[tone],
      )}
    >
      {children}
    </span>
  );
}
export const statusTone = (
  status: string,
): "neutral" | "success" | "warning" | "danger" =>
  /ACTIVE|COMPLETED|DELIVERED|PAID|PROCESSED|APPROVED|PUBLISHED/.test(status)
    ? "success"
    : /FAILED|REJECTED|SUSPENDED|CANCELLED|CLOSED|DISABLED/.test(status)
      ? "danger"
      : /PENDING|URGENT|REVIEW|EXPIRED|DRAFT/.test(status)
        ? "warning"
        : "neutral";
export function Status({ value }: { value?: string | null }) {
  return (
    <Badge tone={statusTone(value ?? "")}>
      {(value ?? "UNKNOWN").replaceAll("_", " ")}
    </Badge>
  );
}
export function Empty({
  title,
  label,
  detail = "Nothing matches the current filters.",
}: {
  title?: string;
  label?: string;
  detail?: string;
}) {
  return (
    <div className="grid min-h-52 place-items-center p-8 text-center">
      <div>
        <p className="font-bold">{title ?? label ?? "No records"}</p>
        <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export function DialogContent({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/45" />
      <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 max-h-[88vh] w-[min(94vw,620px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border bg-card p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <DialogPrimitive.Title className="text-xl font-extrabold">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Close
            aria-label="Close"
            className="rounded-lg p-2 hover:bg-muted"
          >
            <X size={18} />
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
