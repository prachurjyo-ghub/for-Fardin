"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { HiArrowPath, HiBanknotes, HiLockClosed, HiPlus } from "react-icons/hi2"
import { toast } from "sonner"
import { Field, FormControl, FormSelect } from "@/components/shared/form-control"
import { MetricCard } from "@/components/shared/metric-card"
import { PageHeader } from "@/components/shared/page-header"
import { Panel, PanelHead } from "@/components/shared/panel"
import { PortalButton } from "@/components/shared/portal-button"
import { PageSkeleton } from "@/components/shared/skeletons"
import { StatusBadge } from "@/components/shared/status-badge"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { errorMessage } from "@/lib/services/auth"
import { getWallet, submitTopUp } from "@/lib/services/credits"
import type { SupplierWallet, WalletLedgerEntry } from "@/lib/types"
import { useAuth } from "@/providers/auth-provider"

const entryLabel: Record<WalletLedgerEntry["type"], string> = {
  TOP_UP: "Credit top-up",
  CREDIT_RESERVATION: "Commission reserved",
  COMMISSION_SETTLEMENT: "Commission settled",
  RESERVATION_RELEASE: "Reservation released",
  ADJUSTMENT: "Credit adjustment",
  REVERSAL: "Commission reversal",
}

function signed(value: string) {
  const amount = Number(value)
  return `${amount > 0 ? "+" : ""}${amount.toFixed(2)}`
}

export default function CreditWalletPage() {
  const { account, membership } = useAuth()
  const businessId = membership?.business.id
  const [wallet, setWallet] = useState<SupplierWallet | null>(null)
  const [loading, setLoading] = useState(true)
  const [topUpOpen, setTopUpOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ amount: "", paymentMethod: "BANK_TRANSFER", externalReference: "", evidenceReference: "", supplierNote: "" })

  const load = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    try {
      setWallet(await getWallet(businessId))
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [businessId])
  useEffect(() => { void load() }, [load])

  const pending = useMemo(() => wallet?.topUps.filter((item) => item.status === "PENDING") ?? [], [wallet])

  async function submit() {
    if (!businessId) return
    setBusy(true)
    try {
      await submitTopUp(businessId, {
        amount: form.amount,
        paymentMethod: form.paymentMethod,
        externalReference: form.externalReference,
        evidenceReference: form.evidenceReference || undefined,
        supplierNote: form.supplierNote || undefined,
      })
      toast.success("Top-up submitted for verification. Credits will be available only after approval.")
      setTopUpOpen(false)
      setForm({ amount: "", paymentMethod: "BANK_TRANSFER", externalReference: "", evidenceReference: "", supplierNote: "" })
      await load()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <PageSkeleton />
  if (!wallet) return <Panel className="p-8 text-center text-sm text-muted-text">The business wallet could not be loaded.</Panel>

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="PREPAID COMMISSION"
        title="Credit wallet"
        description="One credit equals BDT 1. Credits are reserved when you confirm a commercial order and charged only after a verified successful sale."
        actions={<PortalButton variant="primary" disabled={account?.role !== "SUPPLIER_OWNER"} title={account?.role !== "SUPPLIER_OWNER" ? "Only the business owner can submit a top-up" : undefined} onClick={() => setTopUpOpen(true)}><HiPlus /> Top up credits</PortalButton>}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Available credits" value={Number(wallet.availableCredit).toFixed(2)} meta="Ready for new commitments" icon={<HiBanknotes />} />
        <MetricCard label="Reserved credits" value={Number(wallet.reservedCredit).toFixed(2)} meta="Held for confirmed orders" icon={<HiLockClosed />} />
        <MetricCard label="Total prepaid" value={Number(wallet.totalPrepaidBalance).toFixed(2)} meta="Available + reserved" icon={<HiBanknotes />} />
        <MetricCard label="Commission rate" value={wallet.commissionPolicy ? `${wallet.commissionPolicy.ratePercent}%` : "Not set"} meta="Global PartsArc policy" icon={<HiArrowPath />} />
      </section>

      {pending.length ? <div className="rounded-xl border border-warning/40 bg-warning-bg p-4 text-sm text-warning"><b>{pending.length} top-up {pending.length === 1 ? "is" : "are"} awaiting verification.</b> Submitted evidence does not become spendable credit until PartsArc approves it.</div> : null}

      <div className="grid gap-5 xl:grid-cols-[1.45fr_0.8fr]">
        <Panel>
          <PanelHead title="Wallet activity" meta={`${wallet.entries.length} RECENT EVENTS`} />
          <div className="divide-y divide-line">
            {wallet.entries.length ? wallet.entries.map((entry) => {
              const displayDelta = Number(entry.availableDelta) !== 0
                ? Number(entry.availableDelta)
                : Number(entry.reservedDelta)
              return <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div><p className="font-bold">{entryLabel[entry.type]}</p><p className="mt-1 text-xs text-muted-text">{new Date(entry.createdAt).toLocaleString()} · {entry.reason}{entry.orderId ? " · Related order" : ""}</p></div>
                <div className="text-right"><p className={`font-bold ${displayDelta > 0 ? "text-success" : displayDelta < 0 ? "text-danger" : "text-ink"}`}>{signed(String(displayDelta))} credits</p><p className="text-xs text-muted-text">Available {Number(entry.availableBalance).toFixed(2)}</p></div>
              </div>
            }) : <p className="p-8 text-center text-sm text-muted-text">No wallet activity yet.</p>}
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel>
            <PanelHead title="Credit reservations" />
            <div className="divide-y divide-line">{wallet.reservations.slice(0, 8).map((reservation) => <div key={reservation.id} className="p-4"><div className="flex items-center justify-between gap-2"><b className="text-sm">{reservation.order.orderNumber}</b><StatusBadge status={reservation.status} /></div><p className="mt-1 text-xs text-muted-text">{reservation.commissionAmount} credits · {(reservation.commissionRateBps / 100).toFixed(2)}% of BDT {reservation.eligibleAmount}</p></div>)}{!wallet.reservations.length ? <p className="p-6 text-center text-sm text-muted-text">No commission reservations.</p> : null}</div>
          </Panel>
          <Panel>
            <PanelHead title="Top-up history" />
            <div className="divide-y divide-line">{wallet.topUps.slice(0, 8).map((topUp) => <div key={topUp.id} className="p-4"><div className="flex items-center justify-between gap-2"><b>{topUp.amount} credits</b><StatusBadge status={topUp.status === "PENDING" ? "Pending verification" : topUp.status} /></div><p className="mt-1 text-xs text-muted-text">{topUp.paymentMethod.replaceAll("_", " ")} · {topUp.externalReference} · {new Date(topUp.requestedAt).toLocaleDateString()}</p>{topUp.decisionReason ? <p className="mt-2 text-xs text-danger">{topUp.decisionReason}</p> : null}</div>)}{!wallet.topUps.length ? <p className="p-6 text-center text-sm text-muted-text">No top-up requests.</p> : null}</div>
          </Panel>
        </div>
      </div>

      <Dialog open={topUpOpen} onOpenChange={setTopUpOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Top up credits</DialogTitle></DialogHeader>
          <div className="rounded-xl bg-canvas p-3 text-sm text-muted-text">Submit the reference from your external payment. PartsArc Finance will verify it before credits are added.</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount (BDT / credits)"><FormControl inputMode="decimal" placeholder="1000.00" value={form.amount} onChange={(event) => setForm((value) => ({ ...value, amount: event.target.value }))} /></Field>
            <Field label="Payment method"><FormSelect value={form.paymentMethod} onChange={(event) => setForm((value) => ({ ...value, paymentMethod: event.target.value }))}><option value="BANK_TRANSFER">Bank transfer</option><option value="BKASH">bKash</option><option value="NAGAD">Nagad</option><option value="CASH_DEPOSIT">Cash deposit</option></FormSelect></Field>
            <Field label="Payment reference"><FormControl placeholder="Transaction or deposit reference" value={form.externalReference} onChange={(event) => setForm((value) => ({ ...value, externalReference: event.target.value }))} /></Field>
            <Field label="Evidence reference (optional)"><FormControl placeholder="Receipt URL or file reference" value={form.evidenceReference} onChange={(event) => setForm((value) => ({ ...value, evidenceReference: event.target.value }))} /></Field>
            <Field className="sm:col-span-2" label="Note (optional)"><Textarea value={form.supplierNote} onChange={(event) => setForm((value) => ({ ...value, supplierNote: event.target.value }))} /></Field>
          </div>
          <DialogFooter><PortalButton variant="primary" disabled={busy || !form.amount || !form.externalReference} onClick={() => void submit()}>{busy ? "Submitting…" : "Submit for verification"}</PortalButton></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
