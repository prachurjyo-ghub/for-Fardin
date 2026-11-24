import { api } from "./api";

// API records vary by endpoint; consumers narrow security-sensitive fields before mutation.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Json = Record<string, any>;
export type Page<T = Json> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
export const query = (
  params: Record<string, string | number | boolean | null | undefined>,
) => {
  const value = new URLSearchParams();
  Object.entries(params).forEach(([key, item]) => {
    if (item !== undefined && item !== null && item !== "")
      value.set(key, String(item));
  });
  const text = value.toString();
  return text ? `?${text}` : "";
};
export const get = <T>(path: string) => api<T>(path);
export const send = <T>(
  path: string,
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  body?: unknown,
) =>
  api<T>(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
export const value = (record: Json, ...keys: string[]) => {
  for (const key of keys)
    if (record[key] !== undefined && record[key] !== null) return record[key];
  return undefined;
};
export const text = (item: unknown) =>
  typeof item === "string" || typeof item === "number" ? String(item) : "—";
