"use client";
/* eslint-disable @next/next/no-location-assign-relative-destination */
import { ResourceList } from "@/components/resource-list";
import { StatusCell } from "@/components/page";
import { formatDhaka } from "@/lib/utils";
import { ActionForm } from "@/components/action-form";
import { FormDialog } from "@/components/management";
import { Button } from "@/components/ui";

export default function SuppliersPage() {
  return (
    <ResourceList
      eyebrow="ACCOUNTS"
      title="Supplier businesses"
      description="Create supplier businesses, complete onboarding, and manage access from one clear workspace."
      endpoint="/admin/suppliers"
      detailBase="/suppliers"
      search
      filters={[
        {
          name: "status",
          label: "Business status",
          options: [
            "DRAFT",
            "PENDING_REVIEW",
            "ACTIVE",
            "SUSPENDED",
            "CLOSED",
          ].map((value) => ({ value, label: value.replaceAll("_", " ") })),
        },
      ]}
      columns={[
        { label: "Business", keys: ["displayName", "legalName"] },
        { label: "Code", keys: ["businessCode"] },
        {
          label: "Owner",
          keys: ["ownerUser"],
          render: (row) => {
            const owner = row.ownerUser as {
              fullName?: string;
              email?: string;
            } | null;
            return owner ? (
              <>
                <b>{owner.fullName || owner.email}</b>
                <p className="text-xs text-muted-foreground">{owner.email}</p>
              </>
            ) : (
              <span className="text-muted-foreground">Not onboarded</span>
            );
          },
        },
        {
          label: "Status",
          keys: ["status"],
          render: (row) => <StatusCell row={row} />,
        },
        {
          label: "Created",
          keys: ["createdAt"],
          render: (row) => formatDhaka(row.createdAt),
        },
      ]}
      action={
        <FormDialog
          title="Create supplier business"
          trigger={<Button>Create supplier</Button>}
        >
          <p className="mb-4 text-sm text-muted-foreground">
            Start with the business record. You can add the owner, categories,
            and subscription on the next screen.
          </p>
          <ActionForm
            endpoint="/admin/suppliers"
            submit="Create draft business"
            fields={[
              { name: "legalName", label: "Legal name", required: true },
              { name: "displayName", label: "Display name", required: true },
              { name: "tradeLicense", label: "Trade licence" },
              { name: "email", label: "Business email" },
              { name: "phone", label: "Phone (E.164)" },
              {
                name: "serviceAreas",
                label: "Service areas (comma separated)",
              },
            ]}
            transform={(v) => ({
              legalName: v.legalName,
              displayName: v.displayName,
              tradeLicense: v.tradeLicense || null,
              email: v.email || null,
              phone: v.phone || null,
              serviceAreas: v.serviceAreas
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
            })}
            onDone={(result) => {
              const row = result as { id?: string };
              if (row.id) location.assign(`/suppliers/${row.id}`);
            }}
          />
        </FormDialog>
      }
    />
  );
}
