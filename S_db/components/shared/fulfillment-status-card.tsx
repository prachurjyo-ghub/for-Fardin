import type { DashboardMetrics } from "@/lib/types"

interface FulfillmentStatusCardProps {
  metrics: DashboardMetrics
}

export function FulfillmentStatusCard({ metrics }: FulfillmentStatusCardProps) {
  const { fulfillmentBreakdown, acceptedOrderValue } = metrics
  return (
    <div>
      <div className="flex items-center gap-[17px] px-[18px] pb-4 pt-[18px]">
        <div
          className="relative grid size-[100px] place-items-center rounded-full"
          style={{
            background:
              "conic-gradient(var(--green) 0 42%, var(--blue) 42% 70%, #ffb84d 70% 88%, #d5deea 88%)",
          }}
        >
          <span className="absolute inset-[15px] rounded-full bg-surface" />
          <strong className="relative z-[1] font-heading text-[22px] font-extrabold text-ink">
            {fulfillmentBreakdown.total}
          </strong>
        </div>
        <div>
          <h3 className="m-0 font-heading text-[23px] font-extrabold text-ink">
            {acceptedOrderValue}
          </h3>
          <p className="m-0 mt-1 text-[11px] text-muted-text">
            Eligible supplier payables
          </p>
        </div>
      </div>
      <div className="grid gap-2.5 px-[18px] pb-[18px]">
        {[
          {
            color: "var(--green)",
            label: "Delivered",
            value: fulfillmentBreakdown.delivered,
          },
          {
            color: "var(--blue)",
            label: "In progress",
            value: fulfillmentBreakdown.inProgress,
          },
          {
            color: "#ffb84d",
            label: "Ready for pickup",
            value: fulfillmentBreakdown.readyForPickup,
          },
          {
            color: "#d5deea",
            label: "Exceptions",
            value: fulfillmentBreakdown.exceptions,
          },
        ].map((row) => (
          <div key={row.label} className="flex items-center text-xs text-ink">
            <i
              className="mr-2 size-2 rounded-full"
              style={{ background: row.color }}
            />
            {row.label}
            <b className="ml-auto">{row.value}</b>
          </div>
        ))}
      </div>
      <div className="mx-[18px] mb-[18px] rounded-xl bg-navy p-3.5 text-white">
        <small className="text-[9px] tracking-wide text-[#8da2b7]">
          NEXT ACTION
        </small>
        <strong className="my-1 block text-[13px]">
          {fulfillmentBreakdown.readyForPickup} orders are waiting for pickup
        </strong>
        <p className="m-0 text-[11px] text-[#b7c5d3]">
          Confirm packaging and pickup contact before handover.
        </p>
      </div>
    </div>
  )
}
