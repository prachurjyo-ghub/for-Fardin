"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { DataTabs } from "@/components/shared/data-tabs"
import { Field } from "@/components/shared/form-control"
import { FilterToolbar } from "@/components/shared/filter-toolbar"
import { FormControl, FormSelect, SearchControl } from "@/components/shared/form-control"
import { PageHeader } from "@/components/shared/page-header"
import { Panel } from "@/components/shared/panel"
import { PortalButton } from "@/components/shared/portal-button"
import { DrawerSkeleton, PageSkeleton } from "@/components/shared/skeletons"
import { StatusBadge } from "@/components/shared/status-badge"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { getRequests, skipRequest, submitQuote } from "@/lib/services/requests"
import type { SourcingRequest } from "@/lib/types"
import { useAuth } from "@/providers/auth-provider"
import { errorMessage } from "@/lib/services/auth"

export default function RequestsPage() {
  const { membership } = useAuth()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<SourcingRequest[]>([])
  const [tab, setTab] = useState("new")
  const [search, setSearch] = useState(searchParams.get("q") ?? "")
  const [urgency, setUrgency] = useState("all")
  const [category, setCategory] = useState("all")
  const [selected, setSelected] = useState<SourcingRequest | null>(null)
  const [drawerLoading, setDrawerLoading] = useState(false)
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [quoteForm, setQuoteForm] = useState({
    brand: "",
    condition: "New",
    quantity: 1,
    unitPrice: "",
    preparationTime: "15–30 minutes",
    validUntil: "",
    compatibility: "",
    supplierNotes: "",
  })

  const load = async () => {
    setLoading(true)
    try { setRequests(membership ? await getRequests(membership.business.id) : []) }
    catch (error) { toast.error(errorMessage(error)) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    // Reload only when the selected business changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membership?.business.id])

  useEffect(() => {
    const openId = searchParams.get("open")
    if (!openId || !requests.length) return
    const found = requests.find((r) => r.id === openId)
    if (found) openRequest(found)
    // URL-driven opening is recalculated when the result set changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, requests])

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      const q = search.toLowerCase()
      const matchesSearch = !q || `${r.id} ${r.part} ${r.vehicle}`.toLowerCase().includes(q)
      const matchesUrgency =
        urgency === "all" ||
        (urgency === "urgent" && r.urgent) ||
        (urgency === "standard" && !r.urgent)
      const matchesCategory =
        category === "all" || (r.category ?? "").toLowerCase() === category
      const matchesTab =
        tab === "new"
          ? (r.status ?? "new") === "new"
          : (r.status ?? "new") === tab
      return matchesSearch && matchesUrgency && matchesCategory && matchesTab
    })
  }, [requests, search, urgency, category, tab])

  function openRequest(r: SourcingRequest) {
    setDrawerLoading(true)
    setSelected(r)
    if (membership && r.status === "new") void import("@/lib/services/requests").then(({ markRequestViewed }) => markRequestViewed(r.id, membership.business.id)).catch((error) => toast.error(errorMessage(error)))
    setTimeout(() => setDrawerLoading(false), 220)
  }

  async function handleSkip() {
    if (!selected) return
    if (!membership) return
    await skipRequest(selected.id, membership.business.id)
    toast(`Skipped ${selected.id}`)
    setSelected(null)
    await load()
  }

  async function handleQuoteSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    if (!membership) return
    const result = await submitQuote({
      requestId: selected.id,
      requestItemId: selected.requestItemId ?? "",
      part: selected.part,
      brand: quoteForm.brand,
      condition: quoteForm.condition,
      quantity: quoteForm.quantity,
      unitPrice: quoteForm.unitPrice,
      preparationTime: quoteForm.preparationTime,
      prepTime: quoteForm.preparationTime,
      validUntil: quoteForm.validUntil,
      compatibility: quoteForm.compatibility,
      supplierNotes: quoteForm.supplierNotes,
    }, membership.business.id)
    if (result.ok) {
      toast(`Quotation submitted for ${selected.id}.`)
      setQuoteOpen(false)
      setSelected(null)
      await load()
    }
  }

  if (loading) return <PageSkeleton />

  return (
    <div>
      <PageHeader
        eyebrow="SOURCING REQUESTS"
        title="Request inbox"
        description="Review requests matched to your catalogue and service area."
        actions={<PortalButton>Availability settings</PortalButton>}
      />

      <Panel>
        <DataTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "new", label: "New requests", count: 8 },
            { id: "viewed", label: "Viewed" },
            { id: "quoted", label: "Quoted" },
            { id: "skipped", label: "Skipped" },
          ]}
        />
        <FilterToolbar>
          <SearchControl
            className="min-w-[220px] flex-1"
            placeholder="Search by request, part or vehicle"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <FormSelect value={urgency} onChange={(e) => setUrgency(e.target.value)}>
            <option value="all">All urgency</option>
            <option value="urgent">Urgent</option>
            <option value="standard">Standard</option>
          </FormSelect>
          <FormSelect value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All categories</option>
            <option value="braking">Braking</option>
            <option value="engine">Engine</option>
            <option value="electrical">Electrical</option>
            <option value="suspension">Suspension</option>
          </FormSelect>
        </FilterToolbar>

        <div className="hidden overflow-auto md:block">
          <table className="w-full border-collapse whitespace-nowrap">
            <thead>
              <tr>
                {[
                  "Request",
                  "Requirement",
                  "Vehicle",
                  "Qty",
                  "Location",
                  "Response window",
                  "Action",
                ].map((h) => (
                  <th
                    key={h}
                    className="bg-canvas px-[15px] py-3 text-left text-[10px] font-bold text-muted-text"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-canvas/60">
                  <td className="border-t border-line px-[15px] py-3 text-xs">
                    <span className="cell-title">
                      <i
                        className={cn(
                          "mr-1.5 inline-block size-2 rounded-full bg-[#8c9aac]",
                          r.urgent && "bg-danger shadow-[0_0_0_4px_var(--red-bg)]"
                        )}
                      />
                      {r.id}
                    </span>
                    <span className="cell-sub">
                      {r.urgent ? "Priority sourcing" : "Standard request"}
                    </span>
                  </td>
                  <td className="border-t border-line px-[15px] py-3 text-xs">
                    <span className="cell-title">{r.part}</span>
                    <span className="cell-sub">
                      {r.photo ? "Photo attached" : "Part details supplied"}
                    </span>
                  </td>
                  <td className="border-t border-line px-[15px] py-3 text-xs">
                    {r.vehicle}
                  </td>
                  <td className="border-t border-line px-[15px] py-3 text-xs">
                    {r.qty}
                  </td>
                  <td className="border-t border-line px-[15px] py-3 text-xs">
                    {r.location}
                  </td>
                  <td
                    className={cn(
                      "border-t border-line px-[15px] py-3 text-xs cell-title",
                      r.urgent && "text-danger"
                    )}
                  >
                    {r.expires}
                  </td>
                  <td className="border-t border-line px-[15px] py-3 text-xs">
                    <PortalButton
                      size="sm"
                      variant="primary"
                      onClick={() => openRequest(r)}
                    >
                      Review & quote
                    </PortalButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 p-4 md:hidden">
          {filtered.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => openRequest(r)}
              className="w-full rounded-xl border border-line p-3.5 text-left"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="cell-title text-sm">{r.id}</span>
                <StatusBadge status={r.urgent ? "Urgent" : "Standard"} />
              </div>
              <p className="font-bold">{r.part}</p>
              <p className="mt-1 text-xs text-muted-text">
                {r.vehicle} · {r.location} · Qty {r.qty}
              </p>
              <p className={cn("mt-2 text-xs font-bold", r.urgent && "text-danger")}>
                {r.expires} left
              </p>
            </button>
          ))}
          {!filtered.length ? (
            <p className="py-8 text-center text-sm text-muted-text">
              No requests match your filters.
            </p>
          ) : null}
        </div>
      </Panel>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent
          side="right"
          className="w-full gap-0 p-0 sm:max-w-[520px]"
          showCloseButton={false}
        >
          {drawerLoading || !selected ? (
            <DrawerSkeleton />
          ) : (
            <>
              <SheetHeader className="border-b border-line px-6 py-6 text-left">
                <div className="eyebrow">
                  {selected.urgent ? "PRIORITY REQUEST" : "SOURCING REQUEST"}
                </div>
                <SheetTitle className="font-heading text-xl font-extrabold">
                  {selected.id}
                </SheetTitle>
                <StatusBadge status={selected.urgent ? "Urgent" : "Standard"} />
              </SheetHeader>
              <div className="flex-1 overflow-auto px-6 py-6">
                <div className="mb-6">
                  <h3 className="mb-3 font-heading text-xs font-bold uppercase tracking-wide text-muted-text">
                    Requested part
                  </h3>
                  <div className="grid h-[190px] place-items-center rounded-[13px] border border-line bg-gradient-to-br from-[#dde6ef] to-[#f7f9fc] font-bold text-[#77869b] dark:from-[#13293f] dark:to-[#0d2134]">
                    {selected.photo
                      ? "Customer part photo preview"
                      : "No photo attached"}
                  </div>
                </div>
                <div className="mb-6">
                  <h3 className="mb-3 font-heading text-xs font-bold uppercase tracking-wide text-muted-text">
                    Requirement details
                  </h3>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {[
                      ["Part / requirement", selected.part],
                      ["Quantity", String(selected.qty)],
                      ["Vehicle", selected.vehicle],
                      ["Delivery area", selected.location],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-[11px] border border-line p-[11px]"
                      >
                        <small className="mb-1 block text-[10px] text-muted-text">
                          {label}
                        </small>
                        <strong className="text-xs">{value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mb-6">
                  <h3 className="mb-3 font-heading text-xs font-bold uppercase tracking-wide text-muted-text">
                    Notes
                  </h3>
                  <p className="leading-relaxed text-muted-text">{selected.note}</p>
                </div>
                <div>
                  <h3 className="mb-3 font-heading text-xs font-bold uppercase tracking-wide text-muted-text">
                    Before you quote
                  </h3>
                  <p className="text-xs leading-relaxed text-muted-text">
                    Confirm the exact brand, condition, available quantity,
                    compatibility information and realistic preparation time.
                    Routine used-part quotations follow the established publication flow; operations can still intervene for exceptions.
                  </p>
                </div>
              </div>
              <SheetFooter className="sticky bottom-0 flex-row gap-2.5 border-t border-line bg-surface px-6 py-4">
                <PortalButton className="flex-1" onClick={handleSkip}>
                  Skip request
                </PortalButton>
                <PortalButton
                  className="flex-1"
                  variant="primary"
                  onClick={() => {
                    setQuoteForm((f) => ({ ...f, quantity: selected.qty }))
                    setQuoteOpen(true)
                  }}
                >
                  Prepare quote
                </PortalButton>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={quoteOpen} onOpenChange={setQuoteOpen}>
        <DialogContent
          className="max-h-[94vh] overflow-auto sm:max-w-[650px]"
          showCloseButton
        >
          <DialogHeader>
            <div className="eyebrow">SUBMIT QUOTATION · {selected?.id}</div>
            <DialogTitle className="font-heading text-[21px] font-extrabold">
              {selected?.part}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleQuoteSubmit}>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <Field label="Brand *">
                <FormControl
                  required
                  placeholder="e.g. Advics"
                  value={quoteForm.brand}
                  onChange={(e) =>
                    setQuoteForm((f) => ({ ...f, brand: e.target.value }))
                  }
                />
              </Field>
              <Field label="Condition *">
                <FormSelect
                  required
                  value={quoteForm.condition}
                  onChange={(e) =>
                    setQuoteForm((f) => ({ ...f, condition: e.target.value }))
                  }
                >
                  <option>New</option>
                  <option>Reconditioned</option>
                  <option>Used</option>
                </FormSelect>
              </Field>
              <Field label="Available quantity *">
                <FormControl
                  required
                  type="number"
                  min={1}
                  value={quoteForm.quantity}
                  onChange={(e) =>
                    setQuoteForm((f) => ({
                      ...f,
                      quantity: Number(e.target.value),
                    }))
                  }
                />
              </Field>
              <Field label="Your unit price *">
                <FormControl
                  required
                  inputMode="numeric"
                  placeholder="৳ 0"
                  value={quoteForm.unitPrice}
                  onChange={(e) =>
                    setQuoteForm((f) => ({ ...f, unitPrice: e.target.value }))
                  }
                />
              </Field>
              <Field label="Preparation time *">
                <FormSelect
                  value={quoteForm.preparationTime}
                  onChange={(e) =>
                    setQuoteForm((f) => ({
                      ...f,
                      preparationTime: e.target.value,
                    }))
                  }
                >
                  <option>15–30 minutes</option>
                  <option>30–60 minutes</option>
                  <option>1–2 hours</option>
                  <option>Same day</option>
                </FormSelect>
              </Field>
              <Field label="Availability valid until">
                <FormControl
                  required
                  type="date"
                  value={quoteForm.validUntil}
                  onChange={(e) =>
                    setQuoteForm((f) => ({ ...f, validUntil: e.target.value }))
                  }
                />
              </Field>
              <Field
                label="Compatibility information"
                full
                hint="State what you verified. Do not claim confirmed fitment without supporting details."
              >
                <Textarea
                  rows={3}
                  placeholder="Part number, variant, fitment checks or clarification"
                  value={quoteForm.compatibility}
                  onChange={(e) =>
                    setQuoteForm((f) => ({
                      ...f,
                      compatibility: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field
                label="Condition, warranty and supplier notes"
                full
                hint="Disclose used-part condition accurately and include any applicable warranty terms."
              >
                <Textarea
                  rows={3}
                  placeholder="Condition details, warranty coverage, exclusions or delivery notes"
                  value={quoteForm.supplierNotes}
                  onChange={(e) =>
                    setQuoteForm((f) => ({
                      ...f,
                      supplierNotes: e.target.value,
                    }))
                  }
                />
              </Field>
            </div>
            <DialogFooter className="mt-4 gap-2 sm:justify-end">
              <PortalButton type="button" onClick={() => setQuoteOpen(false)}>
                Cancel
              </PortalButton>
              <PortalButton type="submit" variant="primary">
                Submit quotation
              </PortalButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
