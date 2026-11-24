"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useState } from "react"
import {
  HiCheckCircle,
  HiEye,
  HiEyeSlash,
  HiOutlineEnvelope,
} from "react-icons/hi2"
import { PortalButton } from "@/components/shared/portal-button"
import { acceptInvitation, errorMessage } from "@/lib/services/auth"
import { AuthSurface } from "./login-form"

export function InvitationForm() {
  const token = useSearchParams().get("token") ?? ""
  const [fullName, setFullName] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [accepted, setAccepted] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    if (!token)
      return setError("This activation link is missing its invitation token.")
    if (password !== confirm) return setError("The passwords do not match.")
    if (
      password.length < 12 ||
      !/[a-z]/.test(password) ||
      !/[A-Z]/.test(password) ||
      !/\d/.test(password)
    )
      return setError(
        "Use 12 or more characters with uppercase, lowercase, and a number.",
      )
    setBusy(true)
    try {
      await acceptInvitation({
        token,
        fullName: fullName.trim(),
        password,
      })
      setAccepted(true)
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthSurface>
      {accepted ? (
        <>
          <HiCheckCircle className="size-12 text-success" />
          <p className="eyebrow mt-6">INVITATION ACCEPTED</p>
          <h1 className="font-heading text-3xl font-extrabold tracking-[-0.04em]">
            Your supplier account is ready.
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-text">
            Your owner account has been created. The supplier business remains
            unavailable until an administrator explicitly reviews and activates
            it.
          </p>
          <p className="mt-3 text-sm text-muted-text">
            Invitation acceptance does not sign you in.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-blue px-5 text-sm font-bold text-white"
          >
            Continue to sign in
          </Link>
        </>
      ) : (
        <>
          <span className="grid size-12 place-items-center rounded-2xl bg-blue-2 text-blue">
            <HiOutlineEnvelope className="size-6" />
          </span>
          <p className="eyebrow mt-6">OWNER INVITATION</p>
          <h1 className="font-heading text-3xl font-extrabold tracking-[-0.04em]">
            Activate your account.
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-text">
            The invitation fixes your email, supplier business, and owner role.
            Enter only your name and a password.
          </p>
          <form onSubmit={submit} className="mt-7 space-y-4">
            <label className="block text-xs font-bold">
              Full name
              <input
                className="mt-2 h-12 w-full rounded-xl border border-line bg-surface px-4 text-sm outline-none focus:border-blue"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                minLength={2}
                maxLength={120}
                autoComplete="name"
                required
              />
            </label>
            <label className="block text-xs font-bold">
              Password{" "}
              <small className="mt-1 block font-normal text-muted-text">
                12+ characters, uppercase, lowercase, and a number
              </small>
              <span className="relative mt-2 block">
                <input
                  className="h-12 w-full rounded-xl border border-line bg-surface px-4 pr-12 text-sm outline-none focus:border-blue"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-muted-text hover:bg-canvas hover:text-main-text"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? (
                    <HiEyeSlash className="size-4" aria-hidden="true" />
                  ) : (
                    <HiEye className="size-4" aria-hidden="true" />
                  )}
                </button>
              </span>
            </label>
            <label className="block text-xs font-bold">
              Confirm password
              <span className="relative mt-2 block">
                <input
                  className="h-12 w-full rounded-xl border border-line bg-surface px-4 pr-12 text-sm outline-none focus:border-blue"
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-muted-text hover:bg-canvas hover:text-main-text"
                  aria-label={
                    showConfirm
                      ? "Hide confirmed password"
                      : "Show confirmed password"
                  }
                  aria-pressed={showConfirm}
                  onClick={() => setShowConfirm((value) => !value)}
                >
                  {showConfirm ? (
                    <HiEyeSlash className="size-4" aria-hidden="true" />
                  ) : (
                    <HiEye className="size-4" aria-hidden="true" />
                  )}
                </button>
              </span>
            </label>
            {error && (
              <p
                className="rounded-xl border border-danger/30 bg-danger-bg p-3 text-sm text-danger"
                role="alert"
              >
                {error}
              </p>
            )}
            <PortalButton
              type="submit"
              variant="primary"
              className="w-full"
              disabled={busy}
            >
              {busy ? "Activating…" : "Accept invitation"}
            </PortalButton>
          </form>
          <Link
            href="/login"
            className="mt-5 block text-center text-xs font-bold text-blue hover:underline"
          >
            Already activated? Sign in
          </Link>
        </>
      )}
    </AuthSurface>
  )
}
