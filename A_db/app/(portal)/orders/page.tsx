"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ResourceList } from "@/components/resource-list";
import { StatusCell } from "@/components/page";
import { formatBdt, formatDhaka } from "@/lib/utils";
import { text, value } from "@/lib/admin";

const statuses = [
  "PENDING_SUPPLIER_CONFIRMATION",
  "CONFIRMED",
  "SUPPLIER_PREPARING",
  "READY_FOR_PICKUP",
  "PICKED_UP",
  "IN_DELIVERY",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "FAILED",
  "RETURNED",
].map((item) => ({ value: item, label: item.replaceAll("_", " ") }));

const views = [
  { value: "all", label: "All orders", workflow: "" },
  {
    value: "pending",
    label: "Pending confirmation",
    workflow: "PENDING_CONFIRMATION",
  },
  { value: "progress", label: "In progress", workflow: "IN_PROGRESS" },
  { value: "completed", label: "Completed", workflow: "COMPLETED" },
  {
    value: "exceptions",
    label: "Cancellations & returns",
    workflow: "EXCEPTIONS",
  },
] as const;

export default function OrdersPage() {
  const params = useSearchParams();
  const current =
    views.find((item) => item.value === params.get("view")) ?? views[0];
  return (
    <ResourceList
      eyebrow="FULFILLMENT"
      title="Orders"
      description="The authoritative fulfillment workspace, including supplier confirmation, delivery, commission status, cancellations, and returns."
      endpoint="/admin/orders"
      detailBase="/orders"
      defaults={current.workflow ? { workflow: current.workflow } : {}}
      action={
        <div className="flex flex-wrap gap-2">
          {views.map((item) => (
            <Link
              key={item.value}
              href={`/orders?view=${item.value}`}
              className={`rounded-xl px-3 py-2 text-sm font-bold ${current.value === item.value ? "bg-foreground text-background" : "border bg-background"}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      }
      filters={[
        { name: "status", label: "Exact status", options: statuses },
        {
          name: "urgent",
          label: "Urgency",
          options: [
            { value: "true", label: "Urgent" },
            { value: "false", label: "Standard" },
          ],
        },
      ]}
      columns={[
        { label: "Order", keys: ["orderNumber"] },
        {
          label: "Status",
          keys: ["status"],
          render: (row) => <StatusCell row={row} />,
        },
        {
          label: "Customer total",
          keys: ["customerTotal"],
          render: (row) => formatBdt(value(row, "customerTotal", "total")),
        },
        {
          label: "Commission",
          keys: ["commissionReservation"],
          render: (row) =>
            row.commissionReservation
              ? `${text(row.commissionReservation.status).replaceAll("_", " ")} · ${formatBdt(row.commissionReservation.commissionAmount)}`
              : "Legacy / not reserved",
        },
        {
          label: "Required action",
          keys: ["status"],
          render: (row) =>
            row.status === "PENDING_SUPPLIER_CONFIRMATION"
              ? "Supplier confirmation"
              : row.cancellationRequests?.some(
                    (item: { status?: string }) => item.status === "PENDING",
                  )
                ? "Cancellation decision"
                : row.return &&
                    !["REJECTED", "COMPLETED"].includes(row.return.status)
                  ? "Return review"
                  : "Open workspace",
        },
        {
          label: "Created",
          keys: ["createdAt"],
          render: (row) => formatDhaka(row.createdAt),
        },
      ]}
    />
  );
}
