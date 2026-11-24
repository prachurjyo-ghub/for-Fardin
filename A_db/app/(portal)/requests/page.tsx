"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ResourceList } from "@/components/resource-list";
import { StatusCell } from "@/components/page";
import { formatDhaka } from "@/lib/utils";
import { text, value } from "@/lib/admin";

const statuses = [
  "SUBMITTED",
  "MATCHING",
  "QUOTING",
  "AWAITING_CUSTOMER",
  "ACCEPTED",
  "ORDERED",
  "CANCELLED",
  "EXPIRED",
  "CLOSED",
].map((item) => ({ value: item, label: item.replaceAll("_", " ") }));

const views = [
  { value: "all", label: "All requests" },
  { value: "purchase", label: "Purchase requests" },
  { value: "rfq", label: "RFQs & quotations" },
  { value: "special", label: "Special / unassigned" },
] as const;

export default function RequestsPage() {
  const params = useSearchParams();
  const view = views.some((item) => item.value === params.get("view"))
    ? params.get("view")!
    : "all";
  const requestType =
    view === "purchase"
      ? "FIXED_PRICE_PURCHASE"
      : view === "rfq"
        ? "USED_PART_RFQ"
        : view === "special"
          ? "CUSTOM_SOURCING"
          : "";
  return (
    <ResourceList
      eyebrow="COMMERCE & SOURCING"
      title="Requests"
      description="One workspace for purchase requests, used-parts quotations, and custom sourcing. Open a request for assignments, quotations, activity, and contextual actions."
      endpoint="/admin/requests"
      detailBase="/requests"
      defaults={requestType ? { requestType } : {}}
      action={
        <div className="flex flex-wrap gap-2">
          {views.map((item) => (
            <Link
              key={item.value}
              href={`/requests?view=${item.value}`}
              className={`rounded-xl px-3 py-2 text-sm font-bold ${view === item.value ? "bg-foreground text-background" : "border bg-background"}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      }
      filters={[
        { name: "status", label: "Status", options: statuses },
        {
          name: "urgency",
          label: "Priority",
          options: [
            { value: "STANDARD", label: "Standard" },
            { value: "URGENT", label: "Urgent" },
          ],
        },
      ]}
      columns={[
        { label: "Request", keys: ["requestNumber"] },
        {
          label: "Type",
          keys: ["requestType"],
          render: (row) => text(row.requestType).replaceAll("_", " "),
        },
        {
          label: "Product / requirement",
          keys: ["title", "listing"],
          render: (row) =>
            text(
              row.listing?.product?.name ??
                row.title ??
                row.items?.[0]?.description,
            ),
        },
        {
          label: "Supplier",
          keys: ["targetBusiness"],
          render: (row) => text(row.targetBusiness?.displayName),
        },
        {
          label: "Required action",
          keys: ["creditStatus", "status"],
          render: (row) =>
            row.creditStatus === "AWAITING_CREDITS"
              ? "Supplier credit top-up"
              : row.status === "SUBMITTED"
                ? "Assign or review"
                : row.status === "QUOTING"
                  ? "Monitor quotations"
                  : "Open workspace",
        },
        {
          label: "Status",
          keys: ["status"],
          render: (row) => <StatusCell row={row} />,
        },
        {
          label: "Created",
          keys: ["submittedAt"],
          render: (row) => formatDhaka(value(row, "submittedAt", "createdAt")),
        },
      ]}
    />
  );
}
