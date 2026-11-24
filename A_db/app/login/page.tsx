"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui";
import { PasswordInput } from "@/components/password-input";
import { useAuth } from "@/providers/auth-provider";
import { safeInternalPath } from "@/lib/utils";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
          Preparing secure sign in…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const { login, notice } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const data = new FormData(event.currentTarget);
    const ok = await login(
      String(data.get("email")),
      String(data.get("password")),
    );
    setBusy(false);
    if (ok) router.replace(safeInternalPath(params.get("next")));
  }
  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-[1fr_520px]">
      <section className="hidden bg-[#252729] p-14 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3 text-sm font-black tracking-[.18em]">
          <span className="grid size-10 place-items-center rounded-xl bg-white text-[#252729]">
            A
          </span>
          PartsArc OPERATIONS
        </div>
        <div>
          <p className="mb-4 text-xs font-bold tracking-[.18em] text-stone-400">
            CONTROL WITH CONTEXT
          </p>
          <h1 className="max-w-2xl text-5xl font-black leading-tight">
            Sourcing, fulfillment and finance in one accountable workspace.
          </h1>
          <p className="mt-6 max-w-xl text-stone-300">
            Every enabled action is backed by the PartsArc API. Financial
            records represent externally performed activity.
          </p>
        </div>
        <p className="text-xs text-stone-400">
          Restricted to ADMIN and SUPER_ADMIN accounts.
        </p>
      </section>
      <section className="grid place-items-center p-6">
        <form onSubmit={submit} className="panel w-full max-w-md p-8">
          <ShieldCheck className="mb-6" />
          <p className="text-xs font-black tracking-[.15em] text-muted-foreground">
            SECURE OPERATIONS ACCESS
          </p>
          <h2 className="mt-2 text-3xl font-black">Welcome back</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Access tokens stay in memory. The rotating session uses protected
            cookies.
          </p>
          <div className="mt-8 grid gap-4">
            <label className="label">
              Email
              <input
                className="field"
                name="email"
                type="email"
                required
                autoComplete="username"
              />
            </label>
            <label className="label">
              Password
              <PasswordInput
                name="password"
                required
                autoComplete="current-password"
              />
            </label>
            {notice && (
              <p
                role="alert"
                className="rounded-xl bg-[var(--danger-bg)] p-3 text-sm text-danger"
              >
                {notice}
              </p>
            )}
            <Button disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
          </div>
        </form>
      </section>
    </main>
  );
}
