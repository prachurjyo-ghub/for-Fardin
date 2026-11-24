"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { ActionForm } from "@/components/action-form";
import { FormDialog, SectionCard } from "@/components/management";
import { DataTable, ErrorBox, PageHeader, StatusCell } from "@/components/page";
import { SettlementComposer } from "@/components/settlement-composer";
import { Button, Status } from "@/components/ui";
import { download, message } from "@/lib/api";
import { type Json, type Page, text } from "@/lib/admin";
import { useResource } from "@/lib/use-resource";
import { formatBdt, formatDhaka, idempotencyKey } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

const tabs = [
  "overview",
  "wallets",
  "top-ups",
  "commission",
  "subscriptions",
  "advanced",
] as const;
const ledgers = ["invoices", "transactions", "refunds", "settlements"] as const;
type CreditOverview = {
  wallets: {
    _count: number;
    _sum: { availableCredit: unknown; reservedCredit: unknown };
  };
  pendingTopUps: { _count: number; _sum: { amount: unknown } };
  reservations: { _count: number; _sum: { commissionAmount: unknown } };
  settledCommission: { _count: number; _sum: { commissionAmount: unknown } };
};
type Policy = { current: Json | null; history: Json[] };

export default function FinancePage() {
  const params = useSearchParams();
  const router = useRouter();
  const { account } = useAuth();
  const tab = tabs.includes(params.get("tab") as (typeof tabs)[number])
    ? (params.get("tab") as (typeof tabs)[number])
    : "overview";
  const ledger = ledgers.includes(
    params.get("ledger") as (typeof ledgers)[number],
  )
    ? (params.get("ledger") as (typeof ledgers)[number])
    : "invoices";
  const overview = useResource<CreditOverview>("/admin/credits/overview");
  const policy = useResource<Policy>("/admin/credits/policy");
  const wallets = useResource<Page>(
    "/admin/credits/wallets?page=1&pageSize=100",
  );
  const topUps = useResource<Page>(
    "/admin/credits/top-ups?page=1&pageSize=100",
  );
  const commission = useResource<Page>(
    "/admin/credits/reservations?page=1&pageSize=100",
  );
  const subscriptions = useResource<Page>(
    "/admin/finance/supplier-overview?page=1&pageSize=100",
  );
  const advanced = useResource<Page>(
    `/admin/finance/${ledger}?page=1&pageSize=100`,
  );
  const reloadCredits = async () => {
    await Promise.all([
      overview.reload(),
      policy.reload(),
      wallets.reload(),
      topUps.reload(),
      commission.reload(),
    ]);
  };
  const activeError =
    tab === "overview"
      ? overview.error || policy.error
      : tab === "wallets"
        ? wallets.error
        : tab === "top-ups"
          ? topUps.error
          : tab === "commission"
            ? commission.error
            : tab === "subscriptions"
              ? subscriptions.error
              : advanced.error;
  return (
    <>
      <PageHeader
        eyebrow="FINANCE OPERATIONS"
        title="Finance"
        description="Supplier credits, verified top-ups, commission obligations, subscription billing, and immutable external financial records."
      />
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border bg-muted/30 p-1">
        {tabs.map((item) => (
          <button
            key={item}
            onClick={() => router.replace(`/finance?tab=${item}`)}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold capitalize ${tab === item ? "bg-card shadow-sm" : "text-muted-foreground"}`}
          >
            {item.replaceAll("-", " ")}
          </button>
        ))}
      </div>
      {activeError && <ErrorBox message={activeError} />}

      {tab === "overview" && (
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="Supplier wallets"
              value={overview.data?.wallets._count ?? 0}
              href="/finance?tab=wallets"
            />
            <Metric
              label="Pending top-ups"
              value={overview.data?.pendingTopUps._count ?? 0}
              detail={formatBdt(overview.data?.pendingTopUps._sum.amount)}
              href="/finance?tab=top-ups"
            />
            <Metric
              label="Reserved commission"
              value={formatBdt(
                overview.data?.reservations._sum.commissionAmount,
              )}
              detail={`${overview.data?.reservations._count ?? 0} orders`}
              href="/finance?tab=commission"
            />
            <Metric
              label="Settled commission"
              value={formatBdt(
                overview.data?.settledCommission._sum.commissionAmount,
              )}
              detail={`${overview.data?.settledCommission._count ?? 0} orders`}
              href="/finance?tab=commission"
            />
          </section>
          <SectionCard
            title="Global commission policy"
            description="The active rate is snapshotted at reservation. Policy changes never recalculate prior commitments."
            action={
              policy.data?.current ? (
                <Status value="ACTIVE" />
              ) : (
                <Status value="NOT CONFIGURED" />
              )
            }
          >
            <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
              <div className="rounded-xl border bg-muted/30 p-5">
                <p className="text-xs font-bold uppercase text-muted-foreground">
                  Current rate
                </p>
                <strong className="mt-2 block text-4xl">
                  {policy.data?.current
                    ? `${(Number(policy.data.current.rateBps) / 100).toFixed(2)}%`
                    : "—"}
                </strong>
                <p className="mt-3 text-sm text-muted-foreground">
                  Updated {formatDhaka(policy.data?.current?.effectiveFrom)} by{" "}
                  {text(policy.data?.current?.createdBy?.fullName)}
                </p>
              </div>
              {account?.role === "SUPER_ADMIN" ? (
                <ActionForm
                  endpoint="/admin/credits/policy"
                  submit="Activate new rate"
                  confirm="Activate this rate for new commission reservations? Existing snapshots remain unchanged."
                  fields={[
                    {
                      name: "ratePercent",
                      label: "Commission percentage",
                      type: "number",
                      required: true,
                    },
                    {
                      name: "reason",
                      label: "Audited reason",
                      type: "textarea",
                      required: true,
                    },
                  ]}
                  transform={(value) => ({
                    ratePercent: Number(value.ratePercent),
                    reason: value.reason,
                  })}
                  onDone={reloadCredits}
                  resetOnSuccess
                />
              ) : (
                <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
                  Policy changes require Super Admin access.
                </div>
              )}
            </div>
            <div className="mt-5 space-y-2">
              {(policy.data?.history ?? []).slice(0, 8).map((item) => (
                <div
                  key={String(item.id)}
                  className="flex flex-wrap justify-between gap-3 rounded-xl border p-3 text-sm"
                >
                  <b>{(Number(item.rateBps) / 100).toFixed(2)}%</b>
                  <span>{text(item.reason)}</span>
                  <span className="text-muted-foreground">
                    {formatDhaka(item.effectiveFrom)}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {tab === "wallets" && (
        <DataTable
          page={wallets.data}
          loading={wallets.loading}
          href={(row) => `/finance/wallets/${String(row.id)}`}
          columns={[
            {
              label: "Supplier",
              keys: ["displayName"],
              render: (row) => (
                <div>
                  <b>{text(row.displayName)}</b>
                  <p className="text-xs text-muted-foreground">
                    {text(row.businessCode)}
                  </p>
                </div>
              ),
            },
            {
              label: "Wallet status",
              keys: ["wallet"],
              render: (row) => <Status value={text(row.wallet?.status)} />,
            },
            {
              label: "Available",
              keys: ["wallet"],
              render: (row) => formatBdt(row.wallet?.availableCredit),
            },
            {
              label: "Reserved",
              keys: ["wallet"],
              render: (row) => formatBdt(row.wallet?.reservedCredit),
            },
            {
              label: "Total prepaid",
              keys: ["wallet"],
              render: (row) =>
                formatBdt(
                  Number(row.wallet?.availableCredit ?? 0) +
                    Number(row.wallet?.reservedCredit ?? 0),
                ),
            },
          ]}
        />
      )}

      {tab === "top-ups" && (
        <DataTable
          page={topUps.data}
          loading={topUps.loading}
          columns={[
            {
              label: "Supplier",
              keys: ["business"],
              render: (row) => text(row.business?.displayName),
            },
            { label: "Reference", keys: ["externalReference"] },
            {
              label: "Amount",
              keys: ["amount"],
              render: (row) => formatBdt(row.amount),
            },
            {
              label: "Status",
              keys: ["status"],
              render: (row) => <StatusCell row={row} />,
            },
            {
              label: "Submitted",
              keys: ["requestedAt"],
              render: (row) => formatDhaka(row.requestedAt),
            },
            {
              label: "Decision",
              keys: ["id"],
              render: (row) =>
                row.status === "PENDING" ? (
                  <div className="flex gap-2">
                    <TopUpDecision
                      row={row}
                      decision="APPROVE"
                      reload={reloadCredits}
                    />
                    <TopUpDecision
                      row={row}
                      decision="REJECT"
                      reload={reloadCredits}
                    />
                  </div>
                ) : (
                  text(row.decisionReason)
                ),
            },
          ]}
        />
      )}

      {tab === "commission" && (
        <DataTable
          page={commission.data}
          loading={commission.loading}
          columns={[
            {
              label: "Order",
              keys: ["order"],
              render: (row) => (
                <Link
                  className="font-bold underline"
                  href={`/orders/${row.order?.id}`}
                >
                  {text(row.order?.orderNumber)}
                </Link>
              ),
            },
            {
              label: "Supplier",
              keys: ["business"],
              render: (row) => text(row.business?.displayName),
            },
            {
              label: "Eligible amount",
              keys: ["eligibleAmount"],
              render: (row) => formatBdt(row.eligibleAmount),
            },
            {
              label: "Rate snapshot",
              keys: ["commissionRateBps"],
              render: (row) =>
                `${(Number(row.commissionRateBps) / 100).toFixed(2)}%`,
            },
            {
              label: "Commission",
              keys: ["commissionAmount"],
              render: (row) => formatBdt(row.commissionAmount),
            },
            {
              label: "Status",
              keys: ["status"],
              render: (row) => <StatusCell row={row} />,
            },
            {
              label: "Correction",
              keys: ["id"],
              render: (row) =>
                row.status === "SETTLED" && account?.role === "SUPER_ADMIN" ? (
                  <FormDialog
                    title={`Reverse ${text(row.order?.orderNumber)} commission`}
                    trigger={
                      <Button size="sm" variant="secondary">
                        Reverse
                      </Button>
                    }
                  >
                    <ActionForm
                      endpoint={`/admin/credits/orders/${String(row.order?.id)}/commission-reversal`}
                      submit="Post compensating credit"
                      confirm="Preserve the settlement and post an auditable compensating wallet transaction?"
                      fields={[
                        {
                          name: "reason",
                          label: "Authorized correction reason",
                          type: "textarea",
                          required: true,
                        },
                      ]}
                      transform={(value) => ({
                        reason: value.reason,
                        idempotencyKey: idempotencyKey(
                          `commission-reversal-${String(row.id)}`,
                        ),
                      })}
                      onDone={reloadCredits}
                    />
                  </FormDialog>
                ) : (
                  "—"
                ),
            },
          ]}
        />
      )}

      {tab === "subscriptions" && (
        <DataTable
          page={subscriptions.data}
          loading={subscriptions.loading}
          columns={[
            { label: "Supplier", keys: ["businessName", "displayName"] },
            {
              label: "Status",
              keys: ["status"],
              render: (row) => <StatusCell row={row} />,
            },
            {
              label: "Outstanding",
              keys: ["outstandingAmount"],
              render: (row) => formatBdt(row.outstandingAmount),
            },
            {
              label: "Updated",
              keys: ["updatedAt", "createdAt"],
              render: (row) => formatDhaka(row.updatedAt ?? row.createdAt),
            },
          ]}
        />
      )}

      {tab === "advanced" && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {ledgers.map((item) => (
              <Button
                key={item}
                size="sm"
                variant={ledger === item ? "primary" : "secondary"}
                onClick={() =>
                  router.replace(`/finance?tab=advanced&ledger=${item}`)
                }
              >
                {item}
              </Button>
            ))}
          </div>
          <DataTable
            page={advanced.data}
            loading={advanced.loading}
            columns={[
              {
                label: "Reference",
                keys: [
                  "invoiceNumber",
                  "transactionNumber",
                  "refundNumber",
                  "settlementNumber",
                  "id",
                ],
              },
              {
                label: "Status",
                keys: ["status"],
                render: (row) => <StatusCell row={row} />,
              },
              {
                label: "Amount",
                keys: ["amount", "total"],
                render: (row) => formatBdt(row.amount ?? row.total),
              },
              {
                label: "Recorded",
                keys: ["issuedAt", "occurredAt", "createdAt"],
                render: (row) =>
                  formatDhaka(row.issuedAt ?? row.occurredAt ?? row.createdAt),
              },
              ...(ledger === "invoices"
                ? [
                    {
                      label: "Document",
                      keys: ["id"],
                      render: (row: Json) => (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={async () => {
                            try {
                              const blob = await download(
                                `/admin/finance/invoices/${String(row.id)}/pdf`,
                              );
                              const url = URL.createObjectURL(blob);
                              window.open(url, "_blank", "noopener,noreferrer");
                              setTimeout(
                                () => URL.revokeObjectURL(url),
                                60_000,
                              );
                            } catch (error) {
                              toast.error(message(error));
                            }
                          }}
                        >
                          <Download size={14} /> PDF
                        </Button>
                      ),
                    },
                  ]
                : []),
            ]}
          />
          {ledger === "settlements" && (
            <SettlementComposer onDone={() => advanced.reload()} />
          )}
        </div>
      )}
    </>
  );
}

function Metric({
  label,
  value,
  detail,
  href,
}: {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  href: string;
}) {
  return (
    <Link href={href} className="panel p-5 hover:bg-muted/30">
      <p className="text-xs font-bold uppercase text-muted-foreground">
        {label}
      </p>
      <strong className="mt-2 block text-2xl">{value}</strong>
      {detail && <p className="mt-1 text-sm text-muted-foreground">{detail}</p>}
    </Link>
  );
}

function TopUpDecision({
  row,
  decision,
  reload,
}: {
  row: Json;
  decision: "APPROVE" | "REJECT";
  reload: () => Promise<unknown>;
}) {
  return (
    <FormDialog
      title={`${decision === "APPROVE" ? "Approve" : "Reject"} top-up`}
      trigger={
        <Button
          size="sm"
          variant={decision === "APPROVE" ? "primary" : "secondary"}
        >
          {decision === "APPROVE" ? "Approve" : "Reject"}
        </Button>
      }
    >
      <div className="mb-4 rounded-xl bg-muted p-4 text-sm">
        <b>{text(row.business?.displayName)}</b>
        <p>
          {formatBdt(row.amount)} · {text(row.paymentMethod)} ·{" "}
          {text(row.externalReference)}
        </p>
        <p className="mt-2 text-muted-foreground">
          Evidence: {text(row.evidenceReference)}
        </p>
      </div>
      <ActionForm
        endpoint={`/admin/credits/top-ups/${String(row.id)}/decision`}
        submit={`${decision === "APPROVE" ? "Approve" : "Reject"} top-up`}
        confirm={
          decision === "APPROVE"
            ? "Verify the external payment evidence and credit this supplier wallet?"
            : "Reject this top-up while preserving the submitted evidence?"
        }
        fields={[
          {
            name: "reason",
            label: "Verification note",
            type: "textarea",
            required: true,
          },
        ]}
        transform={(value) => ({
          decision,
          reason: value.reason,
          idempotencyKey: idempotencyKey(
            `top-up-${decision.toLowerCase()}-${String(row.id)}`,
          ),
        })}
        onDone={reload}
      />
    </FormDialog>
  );
}
