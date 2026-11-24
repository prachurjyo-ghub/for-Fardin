"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { HiArrowRight, HiBanknotes, HiClipboardDocumentList, HiCube, HiShoppingBag, HiWrenchScrewdriver } from "react-icons/hi2"
import { toast } from "sonner"
import { MetricCard } from "@/components/shared/metric-card"
import { PageHeader } from "@/components/shared/page-header"
import { Panel, PanelHead } from "@/components/shared/panel"
import { PageSkeleton } from "@/components/shared/skeletons"
import { StatusBadge } from "@/components/shared/status-badge"
import { buttonVariants } from "@/components/ui/button"
import { errorMessage } from "@/lib/services/auth"
import { getSupplierDashboard } from "@/lib/services/dashboard"
import { cn } from "@/lib/utils"
import { useAuth } from "@/providers/auth-provider"

type DashboardData = Awaited<ReturnType<typeof getSupplierDashboard>>

const activityLabel: Record<string, string> = {
  TOP_UP: "Credit top-up",
  CREDIT_RESERVATION: "Commission reserved",
  COMMISSION_SETTLEMENT: "Commission settled",
  RESERVATION_RELEASE: "Reservation released",
  ADJUSTMENT: "Credit adjustment",
  REVERSAL: "Commission reversal",
}

export default function DashboardPage() {
  const { membership } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!membership) return
    let active = true
    setLoading(true)
    void getSupplierDashboard(membership.business.id)
      .then((value) => { if (active) setData(value) })
      .catch((error) => toast.error(errorMessage(error)))
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [membership])

  if (loading || !data) return <PageSkeleton />

  return <div className="space-y-5">
    <PageHeader
      eyebrow="SUPPLIER WORKSPACE"
      title={`Welcome back, ${membership?.business.displayName ?? "supplier"}.`}
      description="What needs your attention today, with live listing, request, order and wallet data."
      actions={<Link href="/listings" className={cn(buttonVariants({ variant: "default" }))}>Add a listing</Link>}
    />

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <MetricCard label="Active listings" value={data.metrics.activeListings} meta="Published" icon={<HiCube />} />
      <MetricCard label="Purchase requests" value={data.metrics.pendingPurchaseRequests} meta="Awaiting response" icon={<HiShoppingBag />} />
      <MetricCard label="Pending RFQs" value={data.metrics.pendingRfqs} meta="Need a quotation" icon={<HiClipboardDocumentList />} />
      <MetricCard label="Active orders" value={data.metrics.activeOrders} meta="In fulfillment" icon={<HiWrenchScrewdriver />} />
      <MetricCard label="Completed sales" value={data.metrics.completedSales} meta="All time" icon={<HiShoppingBag />} />
    </section>

    <Panel>
      <PanelHead title="Credit wallet" action={<Link href="/credit-wallet" className="text-xs font-bold text-blue">Manage credits →</Link>} />
      <div className="grid gap-4 p-5 sm:grid-cols-3">
        <div><p className="text-xs text-muted-text">Available credits</p><p className="mt-1 text-2xl font-black">{Number(data.wallet.availableCredit).toFixed(2)}</p></div>
        <div><p className="text-xs text-muted-text">Reserved credits</p><p className="mt-1 text-2xl font-black">{Number(data.wallet.reservedCredit).toFixed(2)}</p></div>
        <div><p className="text-xs text-muted-text">Global commission rate</p><p className="mt-1 text-2xl font-black">{data.wallet.commissionPolicy ? `${data.wallet.commissionPolicy.ratePercent}%` : "Not set"}</p></div>
      </div>
      {data.metrics.pendingPurchaseRequests > 0 && Number(data.wallet.availableCredit) === 0 ? <div className="border-t border-line bg-warning-bg p-4 text-sm text-warning"><b>Credits may block a pending commercial commitment.</b> <Link href="/credit-wallet" className="font-bold underline">Top up credits</Link></div> : null}
    </Panel>

    <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
      <Panel>
        <PanelHead title="Action required" meta={`${data.actions.length} ITEMS`} />
        {data.actions.length ? <div className="divide-y divide-line">{data.actions.map((action) => <Link key={action.id} href={action.href} className="flex items-center justify-between gap-3 p-4 hover:bg-canvas"><div><p className="font-bold">{action.title}</p><p className="mt-1 text-xs text-muted-text">{action.detail}</p></div><div className="flex items-center gap-2">{action.tone === "warning" ? <StatusBadge status="Action needed" /> : null}<HiArrowRight className="text-blue" /></div></Link>)}</div> : <div className="p-8 text-center"><p className="font-bold">You are all caught up.</p><p className="mt-1 text-sm text-muted-text">New requests and order tasks will appear here.</p></div>}
      </Panel>
      <Panel>
        <PanelHead title="Recent activity" />
        {data.recentActivity.length ? <div className="divide-y divide-line">{data.recentActivity.map((entry) => <div key={entry.id} className="p-4"><div className="flex items-center justify-between gap-2"><b className="text-sm">{activityLabel[entry.type] ?? entry.type}</b><HiBanknotes className="text-blue" /></div><p className="mt-1 text-xs text-muted-text">{entry.reason} · {new Date(entry.createdAt).toLocaleString()}</p></div>)}</div> : <p className="p-8 text-center text-sm text-muted-text">No recent business activity.</p>}
      </Panel>
    </div>
  </div>
}
