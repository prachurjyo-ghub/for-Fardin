import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatBdt = (value: unknown) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 2,
  }).format(Number(value ?? 0));

export const formatDhaka = (value: unknown) =>
  value
    ? new Intl.DateTimeFormat("en-BD", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Dhaka",
      }).format(new Date(String(value))) + " (Asia/Dhaka)"
    : "—";

export const idempotencyKey = (scope: string) =>
  `${scope}-${crypto.randomUUID()}`;

export function safeInternalPath(
  value: string | null,
  fallback = "/dashboard",
) {
  return value && value.startsWith("/") && !value.startsWith("//")
    ? value
    : fallback;
}
