"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { HiKey, HiOutlineBuildingOffice2, HiOutlineCalendarDays } from "react-icons/hi2"
import { toast } from "sonner"
import BusinessProfilePage from "@/components/features/business-profile-page"
import { DataTabs } from "@/components/shared/data-tabs"
import { PageHeader } from "@/components/shared/page-header"
import { Panel, PanelHead } from "@/components/shared/panel"
import { PageSkeleton } from "@/components/shared/skeletons"
import { StatusBadge } from "@/components/shared/status-badge"
import { buttonVariants } from "@/components/ui/button"
import { errorMessage } from "@/lib/services/auth"
import { getCurrentSubscription } from "@/lib/services/subscriptions"
import type { CurrentSubscription } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useAuth } from "@/providers/auth-provider"

export default function BusinessAccountPage() {
  const { membership } = useAuth()
  const [tab, setTab] = useState("profile")
  const [subscription, setSubscription] = useState<CurrentSubscription | null | undefined>(undefined)

  useEffect(() => {
    if (!membership) return
    void getCurrentSubscription(membership.business.id)
      .then(setSubscription)
      .catch((error) => { toast.error(errorMessage(error)); setSubscription(null) })
  }, [membership])

  return <div className="space-y-5">
    <PageHeader eyebrow="BUSINESS & ACCOUNT" title="Business & account" description="Review verified business information, subscription access and account security without exposing Admin-controlled settings." />
    <Panel><DataTabs value={tab} onChange={setTab} tabs={[{ id: "profile", label: "Business profile" }, { id: "subscription", label: "Subscription" }, { id: "security", label: "Account security" }]} /></Panel>
    {tab === "profile" ? <BusinessProfilePage embedded /> : null}
    {tab === "subscription" ? subscription === undefined ? <PageSkeleton /> : <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
      <Panel>
        <PanelHead title="Current plan" action={subscription ? <StatusBadge status={subscription.effectiveStatus} /> : undefined} />
        {subscription ? <dl className="grid gap-5 p-5 sm:grid-cols-2">
          <div><dt className="text-xs text-muted-text">Plan</dt><dd className="mt-1 text-xl font-bold">{subscription.planName}</dd></div>
          <div><dt className="text-xs text-muted-text">Status</dt><dd className="mt-1 font-bold">{subscription.effectiveStatus.replaceAll("_", " ")}</dd></div>
          <div><dt className="text-xs text-muted-text">Start date</dt><dd className="mt-1 font-bold">{new Date(subscription.startsAt).toLocaleDateString()}</dd></div>
          <div><dt className="text-xs text-muted-text">Expiry date</dt><dd className="mt-1 font-bold">{new Date(subscription.endsAt).toLocaleDateString()}</dd></div>
          <div><dt className="text-xs text-muted-text">Term</dt><dd className="mt-1 font-bold">{subscription.durationMonths} month(s)</dd></div>
          <div><dt className="text-xs text-muted-text">Plan value</dt><dd className="mt-1 font-bold">{subscription.complimentary ? "Complimentary" : `${subscription.currency} ${subscription.price}`}</dd></div>
        </dl> : <div className="p-8 text-center"><HiOutlineCalendarDays className="mx-auto size-8 text-muted-text" /><h3 className="mt-3 font-bold">No subscription record</h3><p className="mt-2 text-sm text-muted-text">Contact PartsArc Operations for enrollment or renewal guidance.</p></div>}
      </Panel>
      <Panel className="p-5"><HiOutlineBuildingOffice2 className="size-7 text-blue" /><h3 className="mt-3 font-bold">Admin-managed enrollment</h3><p className="mt-2 text-sm leading-6 text-muted-text">Plans and supplier enrollment are controlled by PartsArc. This portal does not initiate unsupported self-service billing.</p><Link href="/messages" className={cn(buttonVariants({ variant: "outline" }), "mt-5")}>Contact operations</Link></Panel>
    </div> : null}
    {tab === "security" ? <div className="grid gap-5 lg:grid-cols-2">
      <Panel className="p-5"><HiKey className="size-7 text-blue" /><h3 className="mt-3 font-bold">Password</h3><p className="mt-2 text-sm text-muted-text">Change the password for your own supplier account. This does not affect other business members.</p><Link href="/change-password" className={cn(buttonVariants({ variant: "default" }), "mt-5")}>Change password</Link></Panel>
      <Panel className="p-5"><HiOutlineBuildingOffice2 className="size-7 text-blue" /><h3 className="mt-3 font-bold">Active business</h3><p className="mt-2 text-sm text-muted-text">{membership?.business.displayName}<br />Membership and business status are validated on every supplier API request.</p><div className="mt-4"><StatusBadge status={membership?.business.status ?? "Unknown"} /></div></Panel>
    </div> : null}
  </div>
}
