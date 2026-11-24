"use client";

import { use } from "react";
import { ActionForm } from "@/components/action-form";
import { ErrorBox, PageHeader } from "@/components/page";
import { Badge, Status } from "@/components/ui";
import { DetailPageSkeleton } from "@/components/skeletons";
import { type Json } from "@/lib/admin";
import { useResource } from "@/lib/use-resource";

const items = (v: unknown) => (Array.isArray(v) ? (v as Json[]) : []);
const show = (v: unknown) => (v == null || v === "" ? "—" : String(v));
export default function CustomerDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params),
    resource = useResource<Json>(`/admin/customers/${id}`);
  if (resource.loading) return <DetailPageSkeleton />;
  if (resource.error || !resource.data)
    return <ErrorBox message={resource.error || "Customer not found"} />;
  const customer = resource.data,
    profile = (customer.profile as Json | undefined) ?? customer;
  return (
    <>
      <PageHeader
        eyebrow="CUSTOMER ACCOUNT"
        title={show(profile.fullName)}
        description="Approved profile fields only. Email, role, verification and login identity are deliberately not editable here."
        action={
          <Status value={show(customer.accountStatus ?? customer.status)} />
        }
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <div className="panel p-5">
          <h2 className="section-title">Profile</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            {show(customer.email)}
          </p>
          <ActionForm
            endpoint={`/admin/customers/${id}`}
            method="PATCH"
            submit="Save approved fields"
            fields={[
              {
                name: "fullName",
                label: "Full name",
                required: true,
                defaultValue: show(profile.fullName),
              },
              {
                name: "preferredName",
                label: "Preferred name",
                defaultValue: profile.preferredName
                  ? String(profile.preferredName)
                  : "",
              },
              {
                name: "companyName",
                label: "Company name",
                defaultValue: profile.companyName
                  ? String(profile.companyName)
                  : "",
              },
            ]}
            transform={(v) => ({
              fullName: v.fullName,
              preferredName: v.preferredName || null,
              companyName: v.companyName || null,
            })}
            onDone={() => resource.reload()}
          />
        </div>
        <div className="panel p-5">
          <h2 className="section-title">Account restriction</h2>
          {show(customer.accountStatus ?? customer.status) === "SUSPENDED" ? (
            <ActionForm
              endpoint={`/admin/customers/${id}/reactivate`}
              submit="Reactivate customer"
              confirm="Reactivate this customer account?"
              fields={[]}
              onDone={() => resource.reload()}
            />
          ) : (
            <ActionForm
              endpoint={`/admin/customers/${id}/suspend`}
              submit="Suspend and revoke sessions"
              confirm="Suspend this customer and revoke all sessions immediately?"
              fields={[
                {
                  name: "reason",
                  label: "Required audited reason",
                  type: "textarea",
                  required: true,
                },
              ]}
              onDone={() => resource.reload()}
            />
          )}
        </div>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <RecordList
          title="Saved addresses"
          rows={items(profile.addresses)}
          render={(row) => (
            <>
              <b>{show(row.label ?? row.recipientName)}</b>
              <p>
                {show(row.area)}, {show(row.city)}
              </p>
              {row.isDefault && <Badge>Default</Badge>}
            </>
          )}
        />
        <RecordList
          title="Saved vehicles"
          rows={items(profile.vehicles)}
          render={(row) => (
            <>
              <b>
                {show(row.make)} {show(row.model)}
              </b>
              <p>
                {show(row.year)} ·{" "}
                {show(row.registrationNumber ?? row.chassisVin)}
              </p>
            </>
          )}
        />
      </div>
    </>
  );
}
function RecordList({
  title,
  rows,
  render,
}: {
  title: string;
  rows: Json[];
  render: (row: Json) => React.ReactNode;
}) {
  return (
    <div className="panel p-5">
      <h2 className="section-title">{title}</h2>
      <div className="mt-4 grid gap-3">
        {rows.map((row) => (
          <div key={String(row.id)} className="rounded-xl border p-4 text-sm">
            {render(row)}
          </div>
        ))}
        {!rows.length && <p className="help">No records.</p>}
      </div>
    </div>
  );
}
