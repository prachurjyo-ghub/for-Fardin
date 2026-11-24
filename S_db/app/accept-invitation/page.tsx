import type { Metadata } from "next"
import { Suspense } from "react"
import { InvitationForm } from "@/components/auth/invitation-form"

export const metadata: Metadata = {
  title: "Accept Supplier Invitation | PartsArc",
}
export default function InvitationPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center bg-canvas">
          <div className="shine-skeleton h-96 w-[min(92vw,448px)]" />
        </main>
      }
    >
      <InvitationForm />
    </Suspense>
  )
}
