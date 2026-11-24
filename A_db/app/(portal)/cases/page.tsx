"use client";

import { ActionForm } from "@/components/action-form";
import { ResourceList } from "@/components/resource-list";
import { StatusCell } from "@/components/page";
import { formatDhaka } from "@/lib/utils";

const types = [
  "ORDER_EXCEPTION",
  "DELIVERY_EXCEPTION",
  "CANCELLATION",
  "RETURN",
  "REFUND",
  "DISPUTE",
  "OTHER",
];
export default function CasesPage() {
  return (
    <ResourceList
      eyebrow="ISSUES & DISPUTES"
      title="Issues & disputes"
      description="A simplified cross-workflow queue for issues that cannot be resolved directly inside their request or order."
      endpoint="/admin/operations/cases"
      detailBase="/cases"
      filters={[
        {
          name: "status",
          label: "Status",
          options: ["OPEN", "IN_REVIEW", "RESOLVED"].map((value) => ({
            label: value.replaceAll("_", " "),
            value,
          })),
        },
        {
          name: "type",
          label: "Case type",
          options: types.map((value) => ({
            label: value.replaceAll("_", " "),
            value,
          })),
        },
      ]}
      columns={[
        { label: "Case", keys: ["caseNumber", "title"] },
        {
          label: "Type",
          keys: ["type"],
          render: (row) => <StatusCell row={row} keys={["type"]} />,
        },
        {
          label: "Status",
          keys: ["status"],
          render: (row) => <StatusCell row={row} />,
        },
        {
          label: "Updated",
          keys: ["updatedAt"],
          render: (row) => formatDhaka(row.updatedAt),
        },
      ]}
      action={
        <details className="relative">
          <summary className="cursor-pointer rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">
            Open case
          </summary>
          <div className="panel absolute right-0 z-10 mt-2 w-[min(90vw,420px)] p-5">
            <ActionForm
              endpoint="/admin/operations/cases"
              submit="Create case"
              fields={[
                {
                  name: "type",
                  label: "Type",
                  type: "select",
                  options: types.map((value) => ({
                    label: value.replaceAll("_", " "),
                    value,
                  })),
                },
                { name: "title", label: "Title", required: true },
                { name: "orderId", label: "Linked order ID (optional)" },
                { name: "businessId", label: "Linked supplier ID (optional)" },
                {
                  name: "note",
                  label: "Opening note",
                  type: "textarea",
                  required: true,
                },
              ]}
              transform={(v) => ({
                type: v.type,
                title: v.title,
                ...(v.orderId ? { orderId: v.orderId } : {}),
                ...(v.businessId ? { businessId: v.businessId } : {}),
                note: v.note,
              })}
              onDone={() => location.reload()}
            />
          </div>
        </details>
      }
    />
  );
}
