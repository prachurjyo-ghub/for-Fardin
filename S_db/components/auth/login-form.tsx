"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  HiEye,
  HiEyeSlash,
  HiLockClosed,
  HiOutlineBuildingStorefront,
} from "react-icons/hi2"
import { PortalButton } from "@/components/shared/portal-button"
import { useAuth } from "@/providers/auth-provider"

export function LoginForm() {
  const { ready, account, login, notice } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (ready && account) router.replace("/dashboard")
  }, [ready, account, router])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError("")
    const result = await login(email.trim(), password)
    setBusy(false)
    if (result) setError(result)
    else router.replace("/dashboard")
  }

  return (
    <AuthSurface>
      <span className="grid size-12 place-items-center rounded-2xl bg-blue-2 text-blue">
        <HiOutlineBuildingStorefront className="size-6" />
      </span>
      <p className="eyebrow mt-6">SUPPLIER ACCESS</p>
      <h1 className="font-heading text-3xl font-extrabold tracking-[-0.04em]">
        Sign in to PartsArc.
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-text">
        Supplier accounts are provisioned by an administrator. Public supplier
        registration is not available.
      </p>
      <form onSubmit={submit} className="mt-7 space-y-4">
        <label className="block text-xs font-bold">
          Email address
          <input
            className="mt-2 h-12 w-full rounded-xl border border-line bg-surface px-4 text-sm outline-none focus:border-blue"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="block text-xs font-bold">
          Password
          <span className="relative mt-2 block">
            <HiLockClosed className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-text" />
            <input
              className="h-12 w-full rounded-xl border border-line bg-surface pl-11 pr-12 text-sm outline-none focus:border-blue"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
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
        {(error || notice) && (
          <p
            className="rounded-xl border border-danger/30 bg-danger-bg p-3 text-sm text-danger"
            role="alert"
          >
            {error || notice}
          </p>
        )}
        <PortalButton
          type="submit"
          variant="primary"
          className="w-full"
          disabled={busy || !ready}
        >
          {busy || !ready ? "Checking access…" : "Sign in"}
        </PortalButton>
      </form>
      <p className="mt-6 text-center text-xs text-muted-text">
        Have an owner invitation?{" "}
        <Link
          href="/accept-invitation"
          className="font-bold text-blue hover:underline"
        >
          Activate it here
        </Link>
      </p>
    </AuthSurface>
  )
}

export function AuthSurface({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-4 py-12">
      <section className="w-full max-w-md rounded-2xl border border-line bg-surface p-7 shadow-panel sm:p-9">
        {children}
      </section>
    </main>
  )
}
