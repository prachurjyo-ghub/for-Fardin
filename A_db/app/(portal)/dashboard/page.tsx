"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, RefreshCw } from "lucide-react";
import { ErrorBox, PageHeader } from "@/components/page";
import { Badge, Button, Skeleton, Status } from "@/components/ui";
import { get, type Json, type Page, text, value } from "@/lib/admin";
import { message } from "@/lib/api";
import { formatDhaka } from "@/lib/utils";

type SubscriptionDashboard = {
  kpis: {
    activeSubscribedSuppliers: number;
    subscriptionsExpiringSoon: number;
    requestsAwaitingAssignment: number;
    quotationsAwaitingReview: number;
    ordersRequiringAction: number;
  };
  subscriptions: {
    active: number;
    expiring: number;
    expired: number;
    suspended: number;
  };
  activity: Array<{ date: string; requests: number; orders: number }>;
};
type OperationsDashboard = {
  commerce: {
    pendingPurchaseRequests: number;
    pendingRfqs: number;
    ordersAwaitingConfirmation: number;
    activeFulfillment: number;
    pendingWalletTopUps: number;
    creditBlockedRequests: number;
    openDisputes: number;
  };
};

const queues = [
  {
    key: "requests",
    href: "/requests?status=SUBMITTED",
    action: "Assign supplier",
  },
  {
    key: "quotations",
    href: "/requests?view=rfq",
    action: "Review quotation",
  },
  {
    key: "orders",
    href: "/orders?status=PENDING_SUPPLIER_CONFIRMATION",
    action: "Review order",
  },
  {
    key: "cancellations",
    href: "/orders?view=exceptions",
    action: "Review cancellation",
  },
  {
    key: "returns",
    href: "/orders?view=exceptions",
    action: "Review return",
  },
  { key: "refunds", href: "/finance?tab=refunds", action: "Review refund" },
] as const;

const recordLabel = (row: Json) =>
  text(
    value(
      row,
      "requestNumber",
      "quotationNumber",
      "orderNumber",
      "reference",
      "id",
    ),
  );
const created = (row: Json) =>
  value(row, "submittedAt", "createdAt", "occurredAt", "requestedAt");

export default function DashboardPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<SubscriptionDashboard | null>(null);
  const [operations, setOperations] = useState<OperationsDashboard | null>(
    null,
  );
  const [queueData, setQueueData] = useState<Record<string, Page>>({});
  const [activity, setActivity] = useState<Page | null>(null);
  const [error, setError] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [queuesLoading, setQueuesLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);

  const load = useCallback(async () => {
    setSummaryLoading(true);
    setQueuesLoading(true);
    setActivityLoading(true);
    setError("");
    const to = new Date();
    const from = new Date(to);
    from.setUTCDate(from.getUTCDate() - days + 1);
    const failures: string[] = [];
    await Promise.all([
      get<SubscriptionDashboard>(
        `/admin/subscriptions/dashboard?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}&timezone=Asia%2FDhaka`,
      )
        .then(setData)
        .catch((cause) => failures.push(message(cause)))
        .finally(() => setSummaryLoading(false)),
      get<OperationsDashboard>(
        `/admin/operations/dashboard?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}&timezone=Asia%2FDhaka`,
      )
        .then(setOperations)
        .catch((cause) => failures.push(message(cause))),
      Promise.all(
        queues.map((queue) =>
          get<Page>(
            `/admin/operations/queues?queue=${queue.key}&page=1&pageSize=5`,
          ),
        ),
      )
        .then((responses) =>
          setQueueData(
            Object.fromEntries(
              queues.map((queue, index) => [queue.key, responses[index]]),
            ),
          ),
        )
        .catch((cause) => failures.push(message(cause)))
        .finally(() => setQueuesLoading(false)),
      get<Page>("/admin/operations/audit-logs?page=1&pageSize=30")
        .then(setActivity)
        .catch((cause) => failures.push(message(cause)))
        .finally(() => setActivityLoading(false)),
    ]);
    if (failures.length) setError([...new Set(failures)].join(" "));
  }, [days]);

  useEffect(() => {
    void load();
  }, [load]);

  const attention = useMemo(
    () =>
      queues
        .flatMap((queue) =>
          (queueData[queue.key]?.items ?? []).map((row) => ({ queue, row })),
        )
        .sort(
          (a, b) =>
            new Date(String(created(a.row) ?? 0)).getTime() -
            new Date(String(created(b.row) ?? 0)).getTime(),
        )
        .slice(0, 12),
    [queueData],
  );
  const maxVolume = Math.max(
    1,
    ...(data?.activity.map((point) => point.requests + point.orders) ?? [1]),
  );
  const recentActivity = (activity?.items ?? [])
    .filter((row) => !/AUTH_(LOGIN|REFRESH)/.test(text(row.action)))
    .slice(0, 7);
  const kpis =
    data && operations
      ? [
          [
            "Pending purchase requests",
            operations.commerce.pendingPurchaseRequests,
            "/requests?view=purchase",
          ],
          [
            "Pending RFQs",
            operations.commerce.pendingRfqs,
            "/requests?view=rfq",
          ],
          [
            "Awaiting confirmation",
            operations.commerce.ordersAwaitingConfirmation,
            "/orders?view=pending",
          ],
          [
            "Active fulfillment",
            operations.commerce.activeFulfillment,
            "/orders?view=progress",
          ],
          [
            "Pending wallet top-ups",
            operations.commerce.pendingWalletTopUps,
            "/finance?tab=top-ups",
          ],
          [
            "Credit-blocked requests",
            operations.commerce.creditBlockedRequests,
            "/requests?view=purchase",
          ],
          ["Open disputes", operations.commerce.openDisputes, "/cases"],
          [
            "Subscriptions expiring",
            data.kpis.subscriptionsExpiringSoon,
            "/subscriptions?status=expiring",
          ],
        ]
      : [];

  return (
    <>
      <PageHeader
        eyebrow="OPERATIONS OVERVIEW"
        title="What needs attention now"
        description={`Business activity from the last ${days} days. Dates are shown in Asia/Dhaka.`}
        action={
          <div className="flex gap-2">
            <select
              className="h-10 rounded-xl border bg-background px-3 text-sm font-bold"
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
              aria-label="Dashboard date range"
            >
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
            </select>
            <Button variant="secondary" onClick={() => void load()}>
              <RefreshCw size={16} /> Refresh
            </Button>
          </div>
        }
      />
      {error && <ErrorBox message={error} retry={() => void load()} />}
      <section className="panel grid divide-y overflow-hidden sm:grid-cols-2 xl:grid-cols-4 xl:divide-x xl:divide-y-0">
        {summaryLoading
          ? Array.from({ length: 8 }, (_, index) => (
              <div className="p-4" key={index}>
                <Skeleton className="h-16" />
              </div>
            ))
          : kpis.map(([label, count, href]) => (
              <Link
                className="group p-4 hover:bg-muted/40"
                href={String(href)}
                key={String(label)}
              >
                <p className="text-[11px] font-bold leading-4 text-muted-foreground">
                  {label}
                </p>
                <div className="mt-2 flex items-end justify-between">
                  <strong className="text-2xl">{count}</strong>
                  <ArrowRight
                    className="opacity-0 transition group-hover:opacity-100"
                    size={15}
                  />
                </div>
              </Link>
            ))}
      </section>
      <section className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_.75fr]">
        <div className="panel overflow-hidden">
          <div className="border-b p-5">
            <h2 className="section-title">Unified attention queue</h2>
            <p className="help">
              Oldest pending operational records across workflows.
            </p>
          </div>
          {queuesLoading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton className="h-12" key={i} />
              ))}
            </div>
          ) : attention.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="p-3">Record</th>
                    <th>Work type</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th className="p-3 text-right">Next action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {attention.map(({ queue, row }) => (
                    <tr key={`${queue.key}:${text(row.id)}`}>
                      <td className="p-3 font-bold">{recordLabel(row)}</td>
                      <td className="capitalize">{queue.key}</td>
                      <td>
                        <Badge
                          tone={
                            text(row.priority) === "URGENT"
                              ? "danger"
                              : "neutral"
                          }
                        >
                          {row.priority ? text(row.priority) : "STANDARD"}
                        </Badge>
                      </td>
                      <td>
                        <Status
                          value={row.status ? text(row.status) : "PENDING"}
                        />
                      </td>
                      <td>{created(row) ? formatDhaka(created(row)) : "—"}</td>
                      <td className="p-3 text-right">
                        <Link
                          className="font-bold underline-offset-4 hover:underline"
                          href={queue.href}
                        >
                          {queue.action}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No pending operational records in these queues.
            </p>
          )}
        </div>
        <div className="panel p-5">
          <h2 className="section-title">Supplier subscriptions</h2>
          <p className="help">Current paid or transition-grace access.</p>
          <div className="mt-4 divide-y" aria-busy={summaryLoading}>
            {(
              [
                [
                  "Active",
                  data?.subscriptions.active ?? 0,
                  "ACTIVE",
                  "success",
                ],
                [
                  "Expiring soon",
                  data?.subscriptions.expiring ?? 0,
                  "expiring",
                  "warning",
                ],
                [
                  "Expired",
                  data?.subscriptions.expired ?? 0,
                  "EXPIRED",
                  "danger",
                ],
                [
                  "Suspended",
                  data?.subscriptions.suspended ?? 0,
                  "SUSPENDED",
                  "danger",
                ],
              ] as const
            ).map(([label, count, filter, tone]) => (
              <Link
                className="flex items-center justify-between py-3"
                href={`/subscriptions?status=${filter}`}
                key={label}
              >
                <span className="font-bold">{label}</span>
                <Badge tone={tone}>{count}</Badge>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_.75fr]">
        <div className="panel p-5">
          <h2 className="section-title">Requests and orders</h2>
          <p className="help">
            Daily records created in the selected range; no inferred trend.
          </p>
          {summaryLoading ? (
            <Skeleton className="mt-5 h-52" />
          ) : (
            <div
              className="mt-5 flex h-52 items-end gap-1"
              aria-label="Request and order activity chart"
            >
              {(data?.activity ?? []).map((point) => (
                <div
                  className="group flex min-w-0 flex-1 items-end gap-px"
                  key={point.date}
                  title={`${point.date}: ${point.requests} requests, ${point.orders} orders`}
                >
                  <div
                    className="w-1/2 rounded-t bg-stone-500"
                    style={{
                      height: `${Math.max(2, (point.requests / maxVolume) * 100)}%`,
                    }}
                  />
                  <div
                    className="w-1/2 rounded-t bg-emerald-600"
                    style={{
                      height: `${Math.max(2, (point.orders / maxVolume) * 100)}%`,
                    }}
                  />
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex gap-5 text-xs text-muted-foreground">
            <span>
              <i className="mr-2 inline-block size-2 rounded bg-stone-500" />
              Requests
            </span>
            <span>
              <i className="mr-2 inline-block size-2 rounded bg-emerald-600" />
              Orders
            </span>
          </div>
        </div>
        <div className="panel p-5">
          <h2 className="section-title">Recent business activity</h2>
          {activityLoading ? (
            <div className="mt-3 space-y-3">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton className="h-12" key={index} />
              ))}
            </div>
          ) : recentActivity.length ? (
            <div className="mt-3 divide-y">
              {recentActivity.map((row) => (
                <div className="py-3" key={text(row.id)}>
                  <p className="text-sm font-bold capitalize">
                    {text(row.action).replaceAll("_", " ").toLowerCase()}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {text(row.entityType).replaceAll("_", " ")} ·{" "}
                    {formatDhaka(row.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              No recent business mutations.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
