"use client";
import { ResourceList } from "@/components/resource-list";
import { StatusCell } from "@/components/page";
import { formatDhaka } from "@/lib/utils";

export default function CustomersPage() {
  return (
    <ResourceList
      eyebrow="ACCOUNTS"
      title="Customers"
      description="Customer-only account management. Roles and login identifiers are deliberately not editable here."
      endpoint="/admin/customers"
      detailBase="/customers"
      search
      filters={[
        {
          name: "status",
          label: "Account status",
          options: [
            "ACTIVE",
            "PENDING_VERIFICATION",
            "SUSPENDED",
            "DISABLED",
          ].map((value) => ({ value, label: value.replaceAll("_", " ") })),
        },
      ]}
      columns={[
        { label: "Name", keys: ["fullName", "email"] },
        { label: "Email", keys: ["email"] },
        {
          label: "Status",
          keys: ["accountStatus", "status"],
          render: (row) => (
            <StatusCell row={row} keys={["accountStatus", "status"]} />
          ),
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
