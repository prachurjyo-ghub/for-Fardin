"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { ActionForm } from "@/components/action-form";
import {
  FormDialog,
  FriendlyEmpty,
  MoreActions,
  SectionCard,
  ViewTabs,
} from "@/components/management";
import { DataTable, ErrorBox, PageHeader, StatusCell } from "@/components/page";
import { SearchField } from "@/components/search-field";
import { Button, Status } from "@/components/ui";
import { type Json, type Page, text } from "@/lib/admin";
import { download, message } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { useAuth } from "@/providers/auth-provider";
import { formatBdt, formatDhaka, idempotencyKey } from "@/lib/utils";

type View = "plans" | "enrollments";
const today = () => new Date().toISOString().slice(0, 10);
const futureDate = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
const dateIso = (value: string) =>
  new Date(`${value}T12:00:00+06:00`).toISOString();
const show = (value: unknown) =>
  value == null || value === "" ? "—" : String(value);

export default function SubscriptionsPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { account } = useAuth();
  const initialView =
    params.get("view") === "enrollments" ? "enrollments" : "plans";
  const [view, setView] = useState<View>(initialView);
  const [search, setSearch] = useState("");
  const businessId = params.get("businessId") || "";
  const subscriptions = useResource<Page>(
    `/admin/subscriptions?page=1&pageSize=100${businessId ? `&businessId=${encodeURIComponent(businessId)}` : ""}`,
  );
  const plans = useResource<Page>(
    "/admin/subscriptions/plans?page=1&pageSize=100",
  );
  const invoices = useResource<Page>(
    `/admin/subscriptions/invoices?page=1&pageSize=100${businessId ? `&businessId=${encodeURIComponent(businessId)}` : ""}`,
  );
  const suppliers = useResource<Page>("/admin/suppliers?page=1&pageSize=100");
  const reload = async () => {
    await Promise.all([
      subscriptions.reload(),
      plans.reload(),
      invoices.reload(),
      suppliers.reload(),
    ]);
  };
  const activePlans = (plans.data?.items ?? []).filter((plan) => plan.isActive);
  const supplierOptions = (suppliers.data?.items ?? []).map((supplier) => ({
    label: show(supplier.displayName ?? supplier.legalName),
    value: show(supplier.id),
  }));
  const planOptions = activePlans.map((plan) => ({
    label: `${show(plan.name)} · ${plan.durationMonths} month(s) · ${formatBdt(plan.price)}`,
    value: show(plan.id),
  }));
  const filteredSubscriptions = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return subscriptions.data;
    return subscriptions.data
      ? {
          ...subscriptions.data,
          items: subscriptions.data.items.filter((row) =>
            `${show(row.business?.displayName)} ${show(row.planNameSnapshot)} ${show(row.effectiveStatus)}`
              .toLowerCase()
              .includes(needle),
          ),
        }
      : null;
  }, [search, subscriptions.data]);
  const filteredInvoices = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return invoices.data;
    return invoices.data
      ? {
          ...invoices.data,
          items: invoices.data.items.filter((row) =>
            `${show(row.business?.displayName)} ${show(row.invoiceNumber)} ${show(row.status)}`
              .toLowerCase()
              .includes(needle),
          ),
        }
      : null;
  }, [search, invoices.data]);
  const error =
    subscriptions.error || plans.error || invoices.error || suppliers.error;

  const setCurrentView = (next: View) => {
    setView(next);
    const query = new URLSearchParams(params);
    query.set("view", next);
    router.replace(`/subscriptions?${query.toString()}`);
  };

  const assignDialog = (
    <FormDialog
      title="Assign supplier subscription"
      trigger={<Button>Assign subscription</Button>}
    >
      <p className="mb-4 text-sm text-muted-foreground">
        Choose a supplier and plan. PartsArc generates the invoice identity and
        internal request key automatically.
      </p>
      {!supplierOptions.length || !planOptions.length ? (
        <FriendlyEmpty
          title="Assignment is not available"
          detail="You need at least one supplier and one active plan."
        />
      ) : (
        <div className="grid gap-6">
          <ActionForm
            endpoint="/admin/subscriptions/invoices"
            submit="Issue subscription invoice"
            confirm="Issue this immutable subscription invoice?"
            fields={[
              {
                name: "businessId",
                label: "Supplier",
                type: "select",
                options: supplierOptions,
                defaultValue: businessId || supplierOptions[0]?.value,
                required: true,
              },
              {
                name: "planId",
                label: "Plan",
                type: "select",
                options: planOptions,
                required: true,
              },
              {
                name: "dueAt",
                label: "Payment due date",
                type: "date",
                defaultValue: futureDate(7),
                required: true,
              },
            ]}
            transform={(v) => ({
              businessId: v.businessId,
              planId: v.planId,
              dueAt: dateIso(v.dueAt),
              idempotencyKey: idempotencyKey("subscription-invoice"),
            })}
            onDone={reload}
          />
          {account?.role === "SUPER_ADMIN" && (
            <details className="border-t pt-4">
              <summary className="cursor-pointer text-sm font-bold">
                Grant complimentary access instead
              </summary>
              <div className="mt-4">
                <ActionForm
                  endpoint="/admin/subscriptions/complimentary-grants"
                  submit="Grant complimentary access"
                  confirm="Grant access without recording a payment?"
                  fields={[
                    {
                      name: "businessId",
                      label: "Supplier",
                      type: "select",
                      options: supplierOptions,
                      defaultValue: businessId || supplierOptions[0]?.value,
                      required: true,
                    },
                    {
                      name: "planId",
                      label: "Plan",
                      type: "select",
                      options: planOptions,
                      required: true,
                    },
                    {
                      name: "reason",
                      label: "Audited reason",
                      type: "textarea",
                      required: true,
                    },
                  ]}
                  transform={(v) => ({
                    ...v,
                    idempotencyKey: idempotencyKey("complimentary-grant"),
                  })}
                  onDone={reload}
                />
              </div>
            </details>
          )}
        </div>
      )}
    </FormDialog>
  );

  return (
    <>
      <PageHeader
        eyebrow="SUPPLIER BILLING"
        title="Subscriptions"
        description="Manage plan definitions and supplier enrollments without exposing internal record identifiers."
        action={
          view === "plans" ? (
            <FormDialog
              title="Create subscription plan"
              trigger={<Button>Create plan</Button>}
            >
              <ActionForm
                endpoint="/admin/subscriptions/plans"
                submit="Create plan"
                fields={[
                  { name: "name", label: "Plan name", required: true },
                  {
                    name: "durationMonths",
                    label: "Duration",
                    type: "select",
                    options: [
                      { label: "1 calendar month", value: "1" },
                      { label: "4 calendar months", value: "4" },
                      { label: "12 calendar months", value: "12" },
                    ],
                  },
                  {
                    name: "price",
                    label: "Price (BDT)",
                    type: "number",
                    required: true,
                  },
                ]}
                transform={(v) => ({
                  name: v.name,
                  durationMonths: Number(v.durationMonths),
                  price: Number(v.price),
                  isActive: true,
                })}
                onDone={reload}
              />
            </FormDialog>
          ) : (
            assignDialog
          )
        }
      />
      <ViewTabs
        value={view}
        onChange={setCurrentView}
        items={[
          { value: "plans", label: "Plans", count: plans.data?.total },
          {
            value: "enrollments",
            label: "Enrollments",
            count: subscriptions.data?.total,
          },
        ]}
      />
      {error && <ErrorBox message={error} retry={() => void reload()} />}

      {view === "plans" && (
        <SectionCard
          title="Subscription plans"
          description="Plans define the term and price available for new assignments. Existing invoices keep their original snapshot."
        >
          <DataTable
            page={plans.data}
            loading={plans.loading}
            columns={[
              {
                label: "Plan",
                keys: ["name"],
                render: (row) => (
                  <div>
                    <b>{text(row.name)}</b>
                    <p className="text-xs text-muted-foreground">
                      {text(row.durationMonths)} calendar month(s)
                    </p>
                  </div>
                ),
              },
              {
                label: "Price",
                keys: ["price"],
                render: (row) => formatBdt(row.price),
              },
              {
                label: "State",
                keys: ["isActive"],
                render: (row) => (
                  <Status value={row.isActive ? "ACTIVE" : "ARCHIVED"} />
                ),
              },
              {
                label: "Actions",
                keys: ["id"],
                render: (row) => (
                  <FormDialog
                    title={`Edit ${show(row.name)}`}
                    trigger={
                      <Button size="sm" variant="secondary">
                        Edit
                      </Button>
                    }
                  >
                    <ActionForm
                      endpoint={`/admin/subscriptions/plans/${show(row.id)}`}
                      method="PATCH"
                      submit="Save plan"
                      confirm="Update this plan for future assignments? Existing snapshots remain unchanged."
                      fields={[
                        {
                          name: "name",
                          label: "Plan name",
                          required: true,
                          defaultValue: show(row.name),
                        },
                        {
                          name: "durationMonths",
                          label: "Duration",
                          type: "select",
                          defaultValue: Number(row.durationMonths),
                          options: [
                            { label: "1 calendar month", value: "1" },
                            { label: "4 calendar months", value: "4" },
                            { label: "12 calendar months", value: "12" },
                          ],
                        },
                        {
                          name: "price",
                          label: "Price (BDT)",
                          type: "number",
                          required: true,
                          defaultValue: Number(row.price),
                        },
                        {
                          name: "isActive",
                          label: "Availability",
                          type: "select",
                          defaultValue: row.isActive ? "true" : "false",
                          options: [
                            { label: "Active", value: "true" },
                            { label: "Archived", value: "false" },
                          ],
                        },
                      ]}
                      transform={(v) => ({
                        name: v.name,
                        durationMonths: Number(v.durationMonths),
                        price: Number(v.price),
                        isActive: v.isActive === "true",
                      })}
                      onDone={reload}
                    />
                  </FormDialog>
                ),
              },
            ]}
          />
        </SectionCard>
      )}

      {view === "enrollments" && (
        <div className="grid gap-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <SearchField
              containerClassName="max-w-sm"
              label="Search enrollments"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search supplier, plan, or invoice"
            />
            {businessId && (
              <Button variant="secondary" asChild>
                <Link href="/subscriptions?view=enrollments">
                  Clear supplier filter
                </Link>
              </Button>
            )}
          </div>
          <SectionCard
            title="Supplier enrollments"
            description="Current and historical entitlement periods. Lifecycle changes remain separate from business and user access."
          >
            <DataTable
              page={filteredSubscriptions}
              loading={subscriptions.loading}
              columns={[
                {
                  label: "Supplier",
                  keys: ["business"],
                  render: (row) => (
                    <div>
                      <b>{text(row.business?.displayName)}</b>
                      <p className="text-xs text-muted-foreground">
                        {text(row.business?.status)}
                      </p>
                    </div>
                  ),
                },
                {
                  label: "Plan",
                  keys: ["planNameSnapshot"],
                  render: (row) => (
                    <div>
                      <b>{text(row.planNameSnapshot)}</b>
                      <p className="text-xs text-muted-foreground">
                        {formatBdt(row.priceSnapshot)}
                      </p>
                    </div>
                  ),
                },
                {
                  label: "Status",
                  keys: ["effectiveStatus"],
                  render: (row) => (
                    <StatusCell row={{ status: row.effectiveStatus }} />
                  ),
                },
                {
                  label: "Period",
                  keys: ["startsAt"],
                  render: (row) => (
                    <span className="text-xs">
                      {formatDhaka(row.startsAt)}
                      <br />
                      to {formatDhaka(row.endsAt)}
                    </span>
                  ),
                },
                {
                  label: "Actions",
                  keys: ["id"],
                  render: (row) => (
                    <MoreActions>
                      <ActionForm
                        endpoint={(v) =>
                          `/admin/subscriptions/${show(row.id)}/${v.action}`
                        }
                        submit="Apply entitlement action"
                        confirm="Apply this change to the selected entitlement?"
                        fields={[
                          {
                            name: "action",
                            label: "Action",
                            type: "select",
                            options: [
                              { label: "Suspend", value: "suspend" },
                              { label: "Reactivate", value: "reactivate" },
                              { label: "Cancel", value: "cancel" },
                            ],
                          },
                          {
                            name: "reason",
                            label: "Audited reason",
                            type: "textarea",
                            required: true,
                          },
                        ]}
                        transform={(v) => ({ reason: v.reason })}
                        onDone={reload}
                      />
                    </MoreActions>
                  ),
                },
              ]}
            />
          </SectionCard>
          <SectionCard
            title="Invoices & payments"
            description="Record payments that happened outside PartsArc. Full payment activates the related entitlement."
          >
            <DataTable
              page={filteredInvoices}
              loading={invoices.loading}
              columns={[
                {
                  label: "Invoice",
                  keys: ["invoiceNumber"],
                  render: (row) => (
                    <div>
                      <b>{text(row.invoiceNumber)}</b>
                      <p className="text-xs text-muted-foreground">
                        {text(row.plan?.name)}
                      </p>
                    </div>
                  ),
                },
                {
                  label: "Supplier",
                  keys: ["business"],
                  render: (row) => text(row.business?.displayName),
                },
                {
                  label: "Status",
                  keys: ["status"],
                  render: (row) => <StatusCell row={row} />,
                },
                {
                  label: "Balance",
                  keys: ["outstandingAmount"],
                  render: (row) => (
                    <div>
                      <b>{formatBdt(row.outstandingAmount)}</b>
                      <p className="text-xs text-muted-foreground">
                        of {formatBdt(row.amount)}
                      </p>
                    </div>
                  ),
                },
                {
                  label: "Actions",
                  keys: ["id"],
                  render: (row: Json) => (
                    <div className="flex flex-wrap gap-2">
                      {Number(row.outstandingAmount) > 0 &&
                        !["VOID", "PAID"].includes(show(row.status)) && (
                          <FormDialog
                            title={`Record payment for ${show(row.invoiceNumber)}`}
                            trigger={<Button size="sm">Record payment</Button>}
                          >
                            <ActionForm
                              endpoint={`/admin/subscriptions/invoices/${show(row.id)}/payments`}
                              submit="Record external payment"
                              confirm="Confirm this payment occurred outside PartsArc?"
                              fields={[
                                {
                                  name: "amount",
                                  label: `Amount (outstanding ${formatBdt(row.outstandingAmount)})`,
                                  type: "number",
                                  required: true,
                                  defaultValue: Number(row.outstandingAmount),
                                },
                                {
                                  name: "method",
                                  label: "Payment method",
                                  required: true,
                                },
                                {
                                  name: "externalReference",
                                  label: "External reference",
                                },
                                {
                                  name: "occurredAt",
                                  label: "Payment date",
                                  type: "date",
                                  defaultValue: today(),
                                  required: true,
                                },
                                { name: "safeNote", label: "Note" },
                              ]}
                              transform={(v) => ({
                                amount: Number(v.amount),
                                method: v.method,
                                externalReference:
                                  v.externalReference || undefined,
                                occurredAt: dateIso(v.occurredAt),
                                safeNote: v.safeNote || undefined,
                                idempotencyKey: idempotencyKey(
                                  "subscription-payment",
                                ),
                              })}
                              onDone={reload}
                            />
                          </FormDialog>
                        )}
                      <MoreActions>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={async () => {
                            try {
                              const blob = await download(
                                `/admin/subscriptions/invoices/${show(row.id)}/pdf`,
                              );
                              const url = URL.createObjectURL(blob);
                              window.open(url, "_blank", "noopener,noreferrer");
                              setTimeout(() => URL.revokeObjectURL(url), 60000);
                            } catch (error) {
                              toast.error(message(error));
                            }
                          }}
                        >
                          <Download size={14} /> Download PDF
                        </Button>
                        {!["VOID", "PAID"].includes(show(row.status)) && (
                          <ActionForm
                            endpoint={`/admin/subscriptions/invoices/${show(row.id)}/void`}
                            submit="Void invoice"
                            confirm="Void this unpaid invoice while preserving its history?"
                            fields={[
                              {
                                name: "reason",
                                label: "Audited reason",
                                required: true,
                              },
                            ]}
                            onDone={reload}
                          />
                        )}
                        {Array.isArray(row.payments) &&
                          row.payments
                            .filter(
                              (payment) =>
                                payment.kind === "PAYMENT" &&
                                !payment.reversalOfId,
                            )
                            .map((payment) => (
                              <ActionForm
                                key={show(payment.id)}
                                endpoint={`/admin/subscriptions/payments/${show(payment.id)}/reversals`}
                                submit={`Reverse ${formatBdt(payment.amount)} payment`}
                                confirm="Record a linked corrective reversal and suspend the entitlement?"
                                fields={[
                                  {
                                    name: "reason",
                                    label: "Audited reason",
                                    required: true,
                                  },
                                ]}
                                transform={(v) => ({
                                  reason: v.reason,
                                  idempotencyKey:
                                    idempotencyKey("payment-reversal"),
                                })}
                                onDone={reload}
                              />
                            ))}
                      </MoreActions>
                    </div>
                  ),
                },
              ]}
            />
          </SectionCard>
        </div>
      )}
    </>
  );
}
