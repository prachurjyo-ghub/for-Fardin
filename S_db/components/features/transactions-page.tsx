"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  HiArrowDownTray,
  HiBanknotes,
  HiClock,
  HiCurrencyBangladeshi,
} from "react-icons/hi2";
import { DataTabs } from "@/components/shared/data-tabs";
import { FormSelect } from "@/components/shared/form-control";
import { FilterToolbar } from "@/components/shared/filter-toolbar";
import { MetricCard } from "@/components/shared/metric-card";
import { PageHeader } from "@/components/shared/page-header";
import { Panel, PanelHead } from "@/components/shared/panel";
import { PortalButton } from "@/components/shared/portal-button";
import { PageSkeleton } from "@/components/shared/skeletons";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  downloadStatement,
  getTransactionData,
} from "@/lib/services/transactions";
import { errorMessage } from "@/lib/services/auth";
import { apiFileRequest, apiRequest } from "@/lib/services/auth";
import type { Transaction, TransactionSummary } from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";

export default function TransactionsPage() {
  const { membership, account } = useAuth();
  const businessId = membership?.business.id;
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [error, setError] = useState("");
  const [subscriptionInvoices, setSubscriptionInvoices] = useState<
    Array<Record<string, unknown>>
  >([]);
  const [tab, setTab] = useState("all");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    if (!businessId) return;
    setLoading(true);
    getTransactionData(businessId)
      .then((data) => {
        setRows(data.transactions);
        setSummary(data.summary);
        setError("");
      })
      .catch((cause) => setError(errorMessage(cause)))
      .finally(() => setLoading(false));
  }, [businessId]);

  useEffect(() => {
    if (!businessId || account?.role !== "SUPPLIER_OWNER") return;
    void apiRequest<{ items: Array<Record<string, unknown>> }>(
      "/supplier/subscriptions/invoices?page=1&pageSize=20",
      { headers: { "x-business-id": businessId } },
    )
      .then((page) => setSubscriptionInvoices(page.items))
      .catch((cause) => setError(errorMessage(cause)));
  }, [account?.role, businessId]);

  const pending = useMemo(
    () => rows.filter((t) => t.status === "Pending settlement"),
    [rows],
  );
  const completed = useMemo(
    () => rows.filter((t) => t.status === "Completed"),
    [rows],
  );

  const filtered = useMemo(() => {
    return rows.filter((t) => {
      const matchesTab =
        tab === "all" ||
        (tab === "completed" && t.status === "Completed") ||
        (tab === "pending" && t.status === "Pending settlement") ||
        (tab === "other" && ["Failed", "Refunded"].includes(t.status));
      const matchesStatus = status === "all" || t.status === status;
      return matchesTab && matchesStatus;
    });
  }, [rows, tab, status]);

  if (loading) return <PageSkeleton />;

  return (
    <div>
      <PageHeader
        eyebrow="BUSINESS"
        title="Transactions"
        description="Review supplier payables, externally recorded payouts and private statements."
        actions={
          <PortalButton
            disabled={!businessId}
            onClick={() => {
              if (!businessId) return;
              void downloadStatement(businessId)
                .then(() => toast.success("Statement downloaded."))
                .catch((cause) => toast.error(errorMessage(cause)));
            }}
          >
            Export statement
          </PortalButton>
        }
      />

      <section className="mb-[18px] grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Completed payments"
          value={summary?.completedPayments ?? "৳0.00"}
          meta="Externally recorded"
          icon={<HiBanknotes />}
        />
        <MetricCard
          label="Pending settlements"
          value={summary?.pendingSettlements ?? "৳0.00"}
          meta="Outstanding"
          bad
          icon={<HiClock />}
        />
        <MetricCard
          label="Eligible payables"
          value={summary?.monthTotal ?? "৳0.00"}
          meta="Completed orders"
          icon={<HiCurrencyBangladeshi />}
        />
        <MetricCard
          label="Payout entries"
          value={String(completed.length)}
          meta="Recorded transactions"
          icon={<HiArrowDownTray />}
        />
      </section>

      {account?.role === "SUPPLIER_OWNER" && (
        <Panel className="mb-[18px]">
          <PanelHead
            title="Subscription invoices"
            meta="SEPARATE FROM ORDER SETTLEMENTS"
          />
          <div className="divide-y divide-line">
            {subscriptionInvoices.length ? (
              subscriptionInvoices.map((invoice) => (
                <div
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                  key={String(invoice.id)}
                >
                  <div>
                    <p className="font-bold">{String(invoice.invoiceNumber)}</p>
                    <p className="text-xs text-muted-text">
                      {String(invoice.planNameSnapshot)} · BDT{" "}
                      {String(invoice.amount)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={String(invoice.status)} />
                    <PortalButton
                      size="sm"
                      onClick={() => {
                        if (!businessId) return;
                        void apiFileRequest(
                          `/supplier/subscriptions/invoices/${String(invoice.id)}/pdf`,
                          { headers: { "x-business-id": businessId } },
                        )
                          .then(async (response) => {
                            const url = URL.createObjectURL(
                              await response.blob(),
                            );
                            window.open(url, "_blank", "noopener,noreferrer");
                            setTimeout(() => URL.revokeObjectURL(url), 60000);
                          })
                          .catch((cause) => toast.error(errorMessage(cause)));
                      }}
                    >
                      <HiArrowDownTray /> Invoice
                    </PortalButton>
                  </div>
                </div>
              ))
            ) : (
              <p className="p-6 text-center text-sm text-muted-text">
                No subscription invoices.
              </p>
            )}
          </div>
        </Panel>
      )}

      {error && (
        <p className="mb-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30">
          {error}
        </p>
      )}

      <div className="mb-[18px] grid gap-[18px] xl:grid-cols-[1.2fr_0.8fr]">
        <Panel>
          <PanelHead title="Pending settlements" meta="NEXT BATCH" />
          <div className="space-y-3 p-4">
            {pending.length ? (
              pending.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-3"
                >
                  <div>
                    <p className="cell-title text-sm">{t.orderId}</p>
                    <p className="text-xs text-muted-text">
                      {t.part} · {t.date}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{t.net}</p>
                    <StatusBadge status={t.status} />
                  </div>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-sm text-muted-text">
                No pending settlements.
              </p>
            )}
          </div>
        </Panel>
        <Panel>
          <PanelHead title="Settlement insight" />
          <div className="space-y-3 p-5 text-sm text-muted-text">
            <p>
              Payables become eligible only after order completion. Payouts
              shown here are records of transfers completed outside PartsArc.
            </p>
            <div className="rounded-xl bg-navy p-4 text-white">
              <small className="text-[9px] tracking-wide text-[#8da2b7]">
                NEXT ACTION
              </small>
              <strong className="mt-1 block text-sm">
                Confirm bank details in Business Profile
              </strong>
              <p className="mt-1 text-[11px] text-[#b7c5d3]">
                Outstanding amounts remain visible until operations records an
                external payout.
              </p>
            </div>
          </div>
        </Panel>
      </div>

      <Panel>
        <DataTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "all", label: "All transactions" },
            { id: "completed", label: "Completed" },
            { id: "pending", label: "Pending settlement" },
            { id: "other", label: "Refunds / failed" },
          ]}
        />
        <FilterToolbar>
          <FormSelect
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="min-w-[180px]"
          >
            <option value="all">All statuses</option>
            <option>Completed</option>
            <option>Pending settlement</option>
            <option>Refunded</option>
            <option>Failed</option>
          </FormSelect>
        </FilterToolbar>

        <div className="hidden overflow-auto md:block">
          <table className="w-full border-collapse whitespace-nowrap">
            <thead>
              <tr>
                {[
                  "Transaction",
                  "Order",
                  "Part",
                  "Gross",
                  "Fee",
                  "Net",
                  "Date",
                  "Status",
                  "Statement",
                ].map((h) => (
                  <th
                    key={h}
                    className="bg-canvas px-[15px] py-3 text-left text-[10px] font-bold text-muted-text"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-canvas/60">
                  <td className="border-t border-line px-[15px] py-3 text-xs cell-title">
                    {t.id}
                  </td>
                  <td className="border-t border-line px-[15px] py-3 text-xs">
                    {t.orderId}
                  </td>
                  <td className="border-t border-line px-[15px] py-3 text-xs">
                    {t.part}
                  </td>
                  <td className="border-t border-line px-[15px] py-3 text-xs cell-title">
                    {t.amount}
                  </td>
                  <td className="border-t border-line px-[15px] py-3 text-xs">
                    {t.fee}
                  </td>
                  <td className="border-t border-line px-[15px] py-3 text-xs cell-title">
                    {t.net}
                  </td>
                  <td className="border-t border-line px-[15px] py-3 text-xs">
                    {t.date}
                  </td>
                  <td className="border-t border-line px-[15px] py-3 text-xs">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="border-t border-line px-[15px] py-3 text-xs">
                    <PortalButton
                      size="sm"
                      disabled={!businessId}
                      onClick={() => {
                        if (!businessId) return;
                        void downloadStatement(businessId).catch((cause) =>
                          toast.error(errorMessage(cause)),
                        );
                      }}
                    >
                      <HiArrowDownTray /> Download
                    </PortalButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 p-4 md:hidden">
          {filtered.map((t) => (
            <article key={t.id} className="rounded-xl border border-line p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="cell-title">{t.id}</span>
                <StatusBadge status={t.status} />
              </div>
              <p className="font-bold">{t.part}</p>
              <p className="mt-1 text-xs text-muted-text">
                {t.orderId} · {t.date}
              </p>
              <p className="mt-2 text-sm">
                Net {t.net}{" "}
                <span className="text-muted-text">(fee {t.fee})</span>
              </p>
              <PortalButton
                size="sm"
                className="mt-3"
                disabled={!businessId}
                onClick={() => {
                  if (!businessId) return;
                  void downloadStatement(businessId).catch((cause) =>
                    toast.error(errorMessage(cause)),
                  );
                }}
              >
                Download statement
              </PortalButton>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}
