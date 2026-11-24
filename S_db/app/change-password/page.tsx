"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { HiEye, HiEyeSlash, HiLockClosed } from "react-icons/hi2";
import { Button } from "@/components/ui/button";
import { changePassword, errorMessage } from "@/lib/services/auth";
import { useAuth } from "@/providers/auth-provider";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { account } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== confirm)
      return setError("The new passwords do not match.");
    setBusy(true);
    setError("");
    try {
      await changePassword({ currentPassword, newPassword });
      router.replace("/dashboard");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-4 py-12">
      <section className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 shadow-panel">
        <span className="grid size-12 place-items-center rounded-xl bg-blue-2 text-blue">
          <HiLockClosed className="size-6" />
        </span>
        <p className="eyebrow mt-6">SECURE ONBOARDING</p>
        <h1 className="font-heading text-3xl font-extrabold">
          Change temporary password
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-text">
          {account?.email}. Choose your own password before supplier operations
          become available.
        </p>
        <form className="mt-7 space-y-4" onSubmit={submit}>
          {[
            [
              "Current temporary password",
              currentPassword,
              setCurrentPassword,
              showCurrent,
              setShowCurrent,
            ],
            ["New password", newPassword, setNewPassword, showNew, setShowNew],
            ["Confirm new password", confirm, setConfirm, showNew, setShowNew],
          ].map(([label, value, setter, visible, setVisible], index) => (
            <label className="block text-xs font-bold" key={String(label)}>
              {String(label)}
              <span className="relative mt-2 block">
                <input
                  className="h-12 w-full rounded-xl border border-line bg-surface px-4 pr-12 text-sm outline-none focus:border-blue"
                  type={visible ? "text" : "password"}
                  value={String(value)}
                  onChange={(event) =>
                    (setter as React.Dispatch<React.SetStateAction<string>>)(
                      event.target.value,
                    )
                  }
                  autoComplete={
                    index === 0 ? "current-password" : "new-password"
                  }
                  minLength={index ? 12 : 1}
                  maxLength={128}
                  required
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg"
                  aria-label={
                    visible
                      ? `Hide ${String(label).toLowerCase()}`
                      : `Show ${String(label).toLowerCase()}`
                  }
                  onClick={() =>
                    (
                      setVisible as React.Dispatch<
                        React.SetStateAction<boolean>
                      >
                    )((state) => !state)
                  }
                >
                  {visible ? <HiEyeSlash /> : <HiEye />}
                </button>
              </span>
            </label>
          ))}
          {error && (
            <p
              className="rounded-xl border border-danger/30 bg-danger-bg p-3 text-sm text-danger"
              role="alert"
            >
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Changing…" : "Set new password"}
          </Button>
        </form>
      </section>
    </main>
  );
}
