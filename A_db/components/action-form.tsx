"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { message } from "@/lib/api";
import { send } from "@/lib/admin";
import { Button } from "./ui";

export type ActionField = {
  name: string;
  label: string;
  type?:
    | "text"
    | "password"
    | "textarea"
    | "number"
    | "date"
    | "datetime-local"
    | "select";
  required?: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
  defaultValue?: string | number;
};

export function ActionForm({
  endpoint,
  method = "POST",
  fields,
  submit,
  confirm,
  validate,
  transform,
  onDone,
  resetOnSuccess = false,
}: {
  endpoint: string | ((values: Record<string, string>) => string);
  method?: "POST" | "PATCH" | "PUT" | "DELETE";
  fields: ActionField[];
  submit: string;
  confirm?: string;
  validate?: (values: Record<string, string>) => string | null;
  transform?: (values: Record<string, string>) => unknown;
  onDone?: (result: unknown) => unknown | Promise<unknown>;
  resetOnSuccess?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState<
    Record<string, boolean>
  >({});
  return (
    <form
      className="grid gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        if (confirm && !window.confirm(confirm)) return;
        setBusy(true);
        setError("");
        const values = Object.fromEntries(
          new FormData(event.currentTarget).entries(),
        ) as Record<string, string>;
        const validationError = validate?.(values);
        if (validationError) {
          setError(validationError);
          setBusy(false);
          return;
        }
        try {
          const result = await send(
            typeof endpoint === "function" ? endpoint(values) : endpoint,
            method,
            transform ? transform(values) : values,
          );
          toast.success(`${submit} completed`);
          await onDone?.(result);
          if (resetOnSuccess) form.reset();
        } catch (cause) {
          setError(message(cause));
        } finally {
          setBusy(false);
        }
      }}
    >
      {fields.map((field) => (
        <label key={field.name} className="label">
          {field.label}
          {field.type === "textarea" ? (
            <textarea
              className="field min-h-24"
              name={field.name}
              required={field.required}
              placeholder={field.placeholder}
              defaultValue={field.defaultValue}
            />
          ) : field.type === "select" ? (
            <select
              className="field"
              name={field.name}
              required={field.required}
              defaultValue={field.defaultValue}
            >
              {field.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : field.type === "password" ? (
            <span className="relative block">
              <input
                className="field pr-11"
                name={field.name}
                type={visiblePasswords[field.name] ? "text" : "password"}
                required={field.required}
                placeholder={field.placeholder}
                defaultValue={field.defaultValue}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={
                  visiblePasswords[field.name]
                    ? "Hide password"
                    : "Show password"
                }
                onClick={() =>
                  setVisiblePasswords((current) => ({
                    ...current,
                    [field.name]: !current[field.name],
                  }))
                }
              >
                {visiblePasswords[field.name] ? (
                  <EyeOff size={17} />
                ) : (
                  <Eye size={17} />
                )}
              </button>
            </span>
          ) : (
            <input
              className="field"
              name={field.name}
              type={field.type ?? "text"}
              required={field.required}
              placeholder={field.placeholder}
              defaultValue={field.defaultValue}
            />
          )}
        </label>
      ))}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <Button disabled={busy} type="submit">
        {busy ? "Working…" : submit}
      </Button>
    </form>
  );
}
