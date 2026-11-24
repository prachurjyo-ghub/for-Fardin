"use client";

import { use } from "react";
import { ActionForm } from "@/components/action-form";
import { DataTable, ErrorBox, PageHeader, StatusCell } from "@/components/page";
import { Status } from "@/components/ui";
import { type Json, type Page, text } from "@/lib/admin";
import { useResource } from "@/lib/use-resource";
import { formatBdt, formatDhaka, idempotencyKey } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

export default function WalletDetail({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = use(params);
  const { account } = useAuth();
  const wallet = useResource<Json>(`/admin/credits/wallets/${businessId}`);
  if (wallet.error || !wallet.data) {
    return (
      <ErrorBox
        message={wallet.error || "Loading supplier wallet…"}
        retry={() => void wallet.reload()}
      />
    );
  }
  const row = wallet.data;
  const business = row.business as Json | undefined;
  const asPage = (items: Json[]): Page => ({
    items,
    total: items.length,
    page: 1,
    pageSize: Math.max(1, items.length),
  });
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="SUPPLIER WALLET"
        title={text(
          business?.displayName ?? business?.legalName ?? "Supplier credits",
        )}
        description="Available and reserved credits reconcile to the append-only wallet ledger below."
        action={<Status value={text(row.status)} />}
      />
      <section className="grid gap-4 sm:grid-cols-3">
        <Metric label="Available" value={formatBdt(row.availableCredit)} />
        <Metric label="Reserved" value={formatBdt(row.reservedCredit)} />
        <Metric
          label="Total prepaid"
          value={formatBdt(row.totalPrepaidBalance)}
        />
      </section>
      {account?.role === "SUPER_ADMIN" && (
        <section className="panel p-5">
          <h2 className="section-title">Authorized adjustment</h2>
          <p className="help mb-4">
            Use only for audited corrections. A signed immutable ledger entry is
            created; existing entries are never edited.
          </p>
          <ActionForm
            endpoint={`/admin/credits/wallets/${businessId}/adjustments`}
            submit="Post adjustment"
            confirm="Post this signed wallet adjustment?"
            fields={[
              {
                name: "amount",
                label: "Signed amount (BDT)",
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
              amount: Number(value.amount).toFixed(2),
              reason: value.reason,
              idempotencyKey: idempotencyKey(`wallet-adjustment-${businessId}`),
            })}
            onDone={wallet.reload}
            resetOnSuccess
          />
        </section>
      )}
      <section>
        <h2 className="mb-3 text-xl font-black">Ledger</h2>
        <DataTable
          page={asPage((row.entries as Json[]) ?? [])}
          loading={wallet.loading}
          columns={[
            {
              label: "Event",
              keys: ["type"],
              render: (item) => text(item.type).replaceAll("_", " "),
            },
            {
              label: "Available change",
              keys: ["availableDelta"],
              render: (item) => formatBdt(item.availableDelta),
            },
            {
              label: "Reserved change",
              keys: ["reservedDelta"],
              render: (item) => formatBdt(item.reservedDelta),
            },
            {
              label: "Balances after",
              keys: ["availableBalance"],
              render: (item) =>
                `${formatBdt(item.availableBalance)} available · ${formatBdt(item.reservedBalance)} reserved`,
            },
            { label: "Reason", keys: ["reason"] },
            {
              label: "Recorded",
              keys: ["createdAt"],
              render: (item) => formatDhaka(item.createdAt),
            },
          ]}
        />
      </section>
      <section>
        <h2 className="mb-3 text-xl font-black">Top-ups</h2>
        <DataTable
          page={asPage((row.topUps as Json[]) ?? [])}
          loading={wallet.loading}
          columns={[
            { label: "Reference", keys: ["externalReference"] },
            {
              label: "Amount",
              keys: ["amount"],
              render: (item) => formatBdt(item.amount),
            },
            {
              label: "Status",
              keys: ["status"],
              render: (item) => <StatusCell row={item} />,
            },
            {
              label: "Requested",
              keys: ["requestedAt"],
              render: (item) => formatDhaka(item.requestedAt),
            },
          ]}
        />
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel p-5">
      <p className="text-xs font-bold uppercase text-muted-foreground">
        {label}
      </p>
      <strong className="mt-2 block text-2xl">{value}</strong>
    </div>
  );
}
