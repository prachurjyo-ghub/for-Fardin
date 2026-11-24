import type { Metadata } from "next"
import { LoginForm } from "@/components/auth/login-form"

export const metadata: Metadata = { title: "Supplier Sign In | PartsArc" }
export default function LoginPage() {
  return <LoginForm />
}
