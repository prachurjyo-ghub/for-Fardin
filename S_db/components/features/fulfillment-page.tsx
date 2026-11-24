"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { HiArrowRight, HiArrowUp, HiCheck, HiQueueList } from "react-icons/hi2"
import { DataTabs } from "@/components/shared/data-tabs"
import { MetricCard } from "@/components/shared/metric-card"
import { PageHeader } from "@/components/shared/page-header"
import { Panel } from "@/components/shared/panel"
import { PortalButton } from "@/components/shared/portal-button"
import { PageSkeleton } from "@/components/shared/skeletons"
import { StatusBadge } from "@/components/shared/status-badge"
import { Textarea } from "@/components/ui/textarea"
import {
  confirmAvailability,
  getFulfillmentOrders,
  updateOrderStatus,
} from "@/lib/services/fulfillment"
import { errorMessage } from "@/lib/services/auth"
import type { FulfillmentOrder } from "@/lib/types"
import { useAuth } from "@/providers/auth-provider"

const label = (value: string) =>
  value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase())

export default function FulfillmentPage() {
  const { membership } = useAuth()
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [orders, setOrders] = useState<FulfillmentOrder[]>([])
  const [tab, setTab] = useState("all")
  const [selected, setSelected] = useState<FulfillmentOrder | null>(null)
  const [note, setNote] = useState("")

  const load = async () => {
    if (!membership) return setLoading(false)
    setLoading(true)
    try {
      const next = await getFulfillmentOrders(membership.business.id)
      setOrders(next)
      if (selected)
        setSelected(next.find((item) => item.id === selected.id) ?? null)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // Reload only when the selected supplier business changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membership?.business.id])

  const filtered = useMemo(() => {
    if (tab === "preparing")
      return orders.filter((order) => order.status === "SUPPLIER_PREPARING")
    if (tab === "ready")
      return orders.filter((order) => order.status === "READY_FOR_PICKUP")
    if (tab === "exceptions")
      return orders.filter((order) =>
        ["PENDING_SUPPLIER_CONFIRMATION", "FAILED"].includes(order.status),
      )
    if (tab === "completed")
      return orders.filter((order) =>
        ["DELIVERED", "COMPLETED", "RETURNED", "CANCELLED"].includes(
          order.status,
        ),
      )
    return orders
  }, [orders, tab])

  async function action(
    order: FulfillmentOrder,
    run: (businessId: string) => Promise<FulfillmentOrder>,
    message: string,
  ) {
    if (!membership) return
    setBusy(order.id)
    try {
      const updated = await run(membership.business.id)
      setOrders((current) =>
        current.map((item) => (item.id === order.id ? updated : item)),
      )
      setSelected(updated)
      setNote("")
      toast.success(message)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(null)
    }
  }

  if (loading) return <PageSkeleton />

  return (
    <div>
      <PageHeader
        eyebrow="ORDERS & FULFILLMENT"
        title="Orders"
        description="Track confirmed orders, prepare parts, and see the commission lifecycle. Financial settlement remains controlled by authorized PartsArc operations."
      />

      <section className="mb-[18px] grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="To prepare"
          value={String(
            orders.filter((item) => item.status === "CONFIRMED").length,
          )}
          meta="Confirmed"
          icon={<HiQueueList />}
        />
        <MetricCard
          label="Ready for pickup"
          value={String(
            orders.filter((item) => item.status === "READY_FOR_PICKUP").length,
          )}
          meta="Awaiting operations"
          icon={<HiArrowUp />}
        />
        <MetricCard
          label="In delivery"
          value={String(
            orders.filter((item) =>
              ["PICKED_UP", "IN_DELIVERY"].includes(item.status),
            ).length,
          )}
          meta="Managed by PartsArc"
          icon={<HiArrowRight />}
        />
        <MetricCard
          label="Completed"
          value={String(
            orders.filter((item) => item.status === "COMPLETED").length,
          )}
          meta="Live orders"
          icon={<HiCheck />}
        />
      </section>

      <Panel>
        <DataTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "all", label: "All orders" },
            { id: "preparing", label: "In progress" },
            { id: "ready", label: "Awaiting fulfillment" },
            { id: "exceptions", label: "Action required" },
            { id: "completed", label: "Completed" },
          ]}
        />
        {!filtered.length ? (
          <div className="p-10 text-center text-sm text-muted-text">
            No fulfillment orders in this view.
          </div>
        ) : (
          <div className="grid gap-3 p-4 lg:grid-cols-2">
            {filtered.map((order) => (
              <article
                key={order.id}
                className="rounded-xl border border-line p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="cell-title">{order.orderNumber}</span>
                  <StatusBadge status={label(order.status)} />
                </div>
                <p className="mt-3 font-bold">
                  {order.items
                    .map((item) => `${item.quantity}× ${item.description}`)
                    .join(" · ")}
                </p>
                <p className="mt-1 text-xs text-muted-text">
                  ৳{order.supplierPayable} ·{" "}
                  {order.deliveryArea.area ??
                    order.deliveryArea.city ??
                    "Delivery area pending"}
                </p>
                {order.urgent.breached && (
                  <p className="mt-2 text-xs font-bold text-red-600">
                    Urgent target deadline passed
                  </p>
                )}
                <PortalButton
                  size="sm"
                  className="mt-4"
                  onClick={() => setSelected(order)}
                >
                  View & update
                </PortalButton>
              </article>
            ))}
          </div>
        )}
      </Panel>

      {selected && (
        <Panel className="mt-5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="eyebrow">ORDER DETAILS</div>
              <h2 className="mt-2 text-xl font-black">
                {selected.orderNumber}
              </h2>
              <p className="mt-1 text-sm text-muted-text">
                Only the delivery area is shown; customer contact and exact
                address remain private.
              </p>
            </div>
            <button
              className="text-sm font-bold text-muted-text"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {selected.items.map((item) => (
              <div key={item.id} className="rounded-xl border border-line p-3">
                <b>
                  {item.quantity}× {item.description}
                </b>
                <p className="mt-1 text-xs text-muted-text">
                  {item.fulfillmentSource === "INVENTORY"
                    ? `Inventory · ${item.reservationStatus}`
                    : "External sourcing · confirmation required"}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-line bg-canvas p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-muted-text">COMMISSION</p>
                <p className="mt-1 font-bold">
                  {selected.commissionReservation
                    ? `${selected.commissionReservation.commissionAmount} credits at ${(selected.commissionReservation.commissionRateBps / 100).toFixed(2)}%`
                    : "No commission reservation yet"}
                </p>
              </div>
              {selected.commissionReservation ? (
                <StatusBadge status={selected.commissionReservation.status} />
              ) : null}
            </div>
            <p className="mt-2 text-xs text-muted-text">
              Reserved credits are settled only after an authorized successful-sale verification. A pre-settlement cancellation releases them automatically.
            </p>
          </div>
          {selected.failure && (
            <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-200">
              Exception: {selected.failure.reason}
            </p>
          )}
          <Textarea
            className="mt-4"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Optional safe fulfillment note"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            {selected.status === "PENDING_SUPPLIER_CONFIRMATION" && (
              <>
                <PortalButton
                  disabled={busy === selected.id}
                  variant="primary"
                  onClick={() =>
                    void action(
                      selected,
                      (businessId) =>
                        confirmAvailability(
                          selected.id,
                          businessId,
                          true,
                          note,
                        ),
                      "Availability confirmed.",
                    )
                  }
                >
                  Confirm availability
                </PortalButton>
                <PortalButton
                  disabled={busy === selected.id}
                  onClick={() =>
                    void action(
                      selected,
                      (businessId) =>
                        confirmAvailability(
                          selected.id,
                          businessId,
                          false,
                          note || "External sourcing unavailable",
                        ),
                      "Availability declined; operations can review the exception.",
                    )
                  }
                >
                  Cannot fulfill
                </PortalButton>
              </>
            )}
            {selected.status === "CONFIRMED" && (
              <PortalButton
                disabled={busy === selected.id}
                variant="primary"
                onClick={() =>
                  void action(
                    selected,
                    (businessId) =>
                      updateOrderStatus(
                        selected.id,
                        businessId,
                        "SUPPLIER_PREPARING",
                        note,
                      ),
                    "Preparation started.",
                  )
                }
              >
                Start preparation
              </PortalButton>
            )}
            {selected.status === "SUPPLIER_PREPARING" && (
              <PortalButton
                disabled={busy === selected.id}
                variant="primary"
                onClick={() =>
                  void action(
                    selected,
                    (businessId) =>
                      updateOrderStatus(
                        selected.id,
                        businessId,
                        "READY_FOR_PICKUP",
                        note,
                      ),
                    "Order marked ready for pickup.",
                  )
                }
              >
                Mark ready for pickup
              </PortalButton>
            )}
          </div>
          <ol className="mt-6 border-l-2 border-line pl-5">
            {selected.history.map((entry) => (
              <li
                key={entry.id}
                className="border-b border-line py-3 text-sm last:border-0"
              >
                <b>{label(entry.toStatus)}</b>
                <span className="ml-2 text-xs text-muted-text">
                  {new Date(entry.at).toLocaleString()}
                </span>
                {entry.note && (
                  <p className="mt-1 text-xs text-muted-text">{entry.note}</p>
                )}
              </li>
            ))}
          </ol>
        </Panel>
      )}
    </div>
  )
}
