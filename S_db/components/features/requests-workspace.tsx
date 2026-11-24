"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { HiOutlineClipboardDocumentCheck } from "react-icons/hi2"
import { toast } from "sonner"
import QuotationsPage from "@/components/features/quotations-page"
import RequestsPage from "@/components/features/requests-page"
import { DataTabs } from "@/components/shared/data-tabs"
import { EmptyState } from "@/components/shared/empty-state"
import { FormSelect, SearchControl } from "@/components/shared/form-control"
import { PageHeader } from "@/components/shared/page-header"
import { Panel } from "@/components/shared/panel"
import { PortalButton } from "@/components/shared/portal-button"
import { PageSkeleton } from "@/components/shared/skeletons"
import { StatusBadge } from "@/components/shared/status-badge"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { ApiError, errorMessage } from "@/lib/services/auth"
import { confirmPurchaseRequest, getPurchaseRequests } from "@/lib/services/purchase-requests"
import type { FixedPurchaseRequest } from "@/lib/types"
import { useAuth } from "@/providers/auth-provider"

function readable(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/(^|\s)\S/g, (letter) => letter.toUpperCase())
}

function FixedPurchaseRequests() {
  const { membership } = useAuth()
  const businessId = membership?.business.id
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<FixedPurchaseRequest[]>([])
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [selected, setSelected] = useState<FixedPurchaseRequest | null>(null)
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [confirmationError, setConfirmationError] = useState("")

  const load = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    try {
      setRequests((await getPurchaseRequests(businessId)).items)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [businessId])
  useEffect(() => { void load() }, [load])

  const filtered = useMemo(() => requests.filter((request) => {
    const query = search.toLowerCase()
    const match = !query || `${request.requestNumber} ${request.items.map((item) => item.description).join(" ")} ${request.listing?.sku ?? ""}`.toLowerCase().includes(query)
    const statusMatch = status === "all" ||
      (status === "pending" && !request.orders.some((order) => order.status === "CONFIRMED")) ||
      (status === "credits" && request.creditStatus === "AWAITING_CREDITS") ||
      (status === "confirmed" && request.orders.some((order) => order.status === "CONFIRMED")) ||
      (status === "closed" && ["CLOSED", "CANCELLED", "ORDERED"].includes(request.status))
    return match && statusMatch
  }), [requests, search, status])

  async function confirm() {
    if (!businessId || !selected) return
    setBusy(true)
    setConfirmationError("")
    try {
      await confirmPurchaseRequest(businessId, selected.id, note || undefined)
      toast.success("Request confirmed. Stock and commission credits are now reserved.")
      setSelected(null)
      setNote("")
      await load()
    } catch (error) {
      if (error instanceof ApiError && error.code === "INSUFFICIENT_COMMISSION_CREDITS") {
        setConfirmationError("Insufficient credits to confirm this request. The request remains pending and can be retried after a verified top-up.")
      } else {
        setConfirmationError(errorMessage(error))
      }
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <PageSkeleton />

  return <div className="space-y-5">
    <PageHeader eyebrow="FIXED-PRICE REQUESTS" title="Purchase requests" description="Confirm genuine and aftermarket availability. PartsArc reserves stock and commission credits together, so a failed credit check never confirms the order." />
    <Panel>
      <div className="flex flex-wrap gap-3 border-b border-line p-4">
        <SearchControl className="min-w-[240px] flex-1" placeholder="Search reference, product or SKU" value={search} onChange={(event) => setSearch(event.target.value)} />
        <FormSelect value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All requests</option><option value="pending">Pending</option><option value="credits">Awaiting credits</option><option value="confirmed">Confirmed</option><option value="closed">Closed</option></FormSelect>
      </div>
      {filtered.length ? <div className="divide-y divide-line">{filtered.map((request) => {
        const quantity = request.items.reduce((total, item) => total + item.quantity, 0)
        const order = request.orders[0]
        return <article key={request.id} className="grid gap-4 p-4 md:grid-cols-[1.3fr_0.8fr_0.65fr_0.8fr_auto] md:items-center">
          <div><p className="font-bold">{request.requestNumber}</p><p className="mt-1 text-sm">{request.items.map((item) => item.description).join(", ")}</p><p className="mt-1 text-xs text-muted-text">{request.submittedAt ? new Date(request.submittedAt).toLocaleString() : "Submission time unavailable"}</p></div>
          <div><span className="text-[10px] font-bold uppercase text-muted-text">Quantity</span><p className="font-bold">{quantity}</p></div>
          <div><span className="text-[10px] font-bold uppercase text-muted-text">Price</span><p className="font-bold">৳{request.listing ? (Number(request.listing.unitPrice) * quantity).toFixed(2) : "—"}</p></div>
          <div><StatusBadge status={order?.status ?? request.creditStatus} />{request.creditStatus === "AWAITING_CREDITS" ? <p className="mt-1 text-xs text-danger">Needs {request.commissionRequirement.additionalCreditNeeded} more credits</p> : null}</div>
          <div>{order?.status === "CONFIRMED" ? <Link href="/orders" className="text-xs font-bold text-blue">View order →</Link> : <PortalButton size="sm" variant="primary" onClick={() => { setSelected(request); setConfirmationError("") }}>Review</PortalButton>}</div>
        </article>
      })}</div> : <EmptyState icon={<HiOutlineClipboardDocumentCheck />} title="No purchase requests" description="New fixed-price requests assigned to this business will appear here." />}
    </Panel>

    <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader><SheetTitle>{selected?.requestNumber}</SheetTitle></SheetHeader>
        {selected ? <div className="space-y-5 p-5">
          <section><p className="text-[10px] font-bold uppercase text-muted-text">Requested product</p><h3 className="mt-1 text-lg font-bold">{selected.items.map((item) => item.description).join(", ")}</h3><p className="mt-1 text-sm text-muted-text">{selected.items.reduce((total, item) => total + item.quantity, 0)} unit(s) · {selected.listing?.listingClassification ? readable(selected.listing.listingClassification) : "Fixed-price listing"}</p></section>
          <section className="grid grid-cols-2 gap-3 rounded-xl bg-canvas p-4"><div><p className="text-xs text-muted-text">Required commission</p><b>{selected.commissionRequirement.requiredCredit ?? "—"} credits</b></div><div><p className="text-xs text-muted-text">Available credits</p><b>{selected.commissionRequirement.availableCredit} credits</b></div><div><p className="text-xs text-muted-text">Price per unit</p><b>৳{selected.listing?.unitPrice ?? "—"}</b></div><div><p className="text-xs text-muted-text">Credit status</p><StatusBadge status={selected.creditStatus} /></div></section>
          {selected.customerNotes ? <section><p className="text-xs font-bold">Request note</p><p className="mt-1 text-sm text-muted-text">{selected.customerNotes}</p></section> : null}
          <section className="rounded-xl border border-line p-4 text-sm text-muted-text">Customer email, phone and exact address are intentionally private at this stage. Authorized fulfillment details remain limited to the existing order workflow.</section>
          <label className="block text-xs font-bold">Confirmation note (optional)<Textarea className="mt-2" value={note} onChange={(event) => setNote(event.target.value)} /></label>
          {confirmationError ? <div className="rounded-xl border border-danger/30 bg-danger-bg p-3 text-sm text-danger"><b>{confirmationError}</b>{selected.creditStatus === "AWAITING_CREDITS" || Number(selected.commissionRequirement.additionalCreditNeeded) > 0 ? <Link href="/credit-wallet" className="mt-2 block font-bold underline">Top up credits →</Link> : null}</div> : null}
        </div> : null}
        <SheetFooter className="border-t border-line p-4"><PortalButton variant="primary" disabled={busy || !!selected?.orders.find((order) => order.status === "CONFIRMED")} onClick={() => void confirm()}>{busy ? "Checking credits…" : "Confirm availability"}</PortalButton></SheetFooter>
      </SheetContent>
    </Sheet>
  </div>
}

export default function RequestsWorkspace() {
  const [view, setView] = useState("purchases")
  return <div className="space-y-5">
    <Panel><DataTabs value={view} onChange={setView} tabs={[{ id: "purchases", label: "Purchase requests" }, { id: "rfqs", label: "Used-part RFQs" }, { id: "quotations", label: "My quotations" }]} /></Panel>
    {view === "purchases" ? <FixedPurchaseRequests /> : view === "rfqs" ? <RequestsPage /> : <QuotationsPage />}
  </div>
}
