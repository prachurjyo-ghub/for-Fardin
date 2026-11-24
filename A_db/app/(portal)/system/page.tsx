"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ActionForm } from "@/components/action-form";
import { DataTable, ErrorBox, PageHeader, StatusCell } from "@/components/page";
import { Button, Skeleton, Status } from "@/components/ui";
import { message } from "@/lib/api";
import { send, type Json, type Page } from "@/lib/admin";
import { useResource } from "@/lib/use-resource";
import { formatDhaka } from "@/lib/utils";

export default function SystemPage() {
  const readiness = useResource<Json>("/health/readiness"),
    audit = useResource<Page>(
      "/admin/operations/audit-logs?page=1&pageSize=20",
    ),
    outbox = useResource<Page>("/admin/jobs/outbox?page=1&pageSize=20"),
    config = useResource<Json>("/admin/operations/configuration"),
    [busy, setBusy] = useState("");
  const run = async (path: string, label: string) => {
    setBusy(label);
    try {
      await send(path, "POST");
      toast.success(`${label} completed`);
      await outbox.reload();
    } catch (error) {
      toast.error(message(error));
    } finally {
      setBusy("");
    }
  };
  return (
    <>
      <PageHeader
        eyebrow="RESTRICTED ADMINISTRATION"
        title="Settings & audit"
        description="Actual health, bounded audit access, outbox inspection and explicit reconciliation controls. No secrets or unrestricted configuration are exposed."
      />
      <section className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
        <div className="panel p-5">
          <h2 className="section-title">Readiness</h2>
          {readiness.loading ? (
            <Skeleton className="mt-4" />
          ) : readiness.error ? (
            <ErrorBox message={readiness.error} />
          ) : (
            <pre className="mt-4 overflow-auto rounded-xl bg-muted p-4 text-xs">
              {JSON.stringify(readiness.data, null, 2)}
            </pre>
          )}
        </div>
        <div className="panel p-5">
          <h2 className="section-title">Business invoice identity</h2>
          {config.data && (
            <ActionForm
              endpoint="/admin/operations/configuration"
              method="PUT"
              submit="Save validated identity"
              confirm="This identity will be snapshotted onto newly issued invoices."
              fields={[
                {
                  name: "legalName",
                  label: "Legal name",
                  required: true,
                  defaultValue: String(config.data.legalName ?? ""),
                },
                {
                  name: "tradingName",
                  label: "Trading name",
                  required: true,
                  defaultValue: String(config.data.tradingName ?? ""),
                },
                {
                  name: "address",
                  label: "Registered address",
                  type: "textarea",
                  required: true,
                  defaultValue: String(config.data.address ?? ""),
                },
                {
                  name: "phone",
                  label: "Phone",
                  defaultValue: String(config.data.phone ?? ""),
                },
                {
                  name: "email",
                  label: "Email",
                  defaultValue: String(config.data.email ?? ""),
                },
                {
                  name: "taxIdentifier",
                  label: "Tax identifier",
                  defaultValue: String(config.data.taxIdentifier ?? ""),
                },
                {
                  name: "isPlaceholder",
                  label: "Identity state",
                  type: "select",
                  defaultValue: String(config.data.isPlaceholder ?? true),
                  options: [
                    { label: "Development placeholder", value: "true" },
                    { label: "Production verified details", value: "false" },
                  ],
                },
              ]}
              transform={(v) => ({
                ...v,
                phone: v.phone || null,
                email: v.email || null,
                taxIdentifier: v.taxIdentifier || null,
                isPlaceholder: v.isPlaceholder === "true",
              })}
              onDone={() => config.reload()}
            />
          )}
        </div>
      </section>
      <section className="mt-6 panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="section-title">Domain outbox</h2>
            <p className="help">
              Retries and processing are idempotent. Actual worker/readiness
              state above remains authoritative.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={Boolean(busy)}
              onClick={() =>
                void run("/admin/jobs/outbox/process", "Process bounded batch")
              }
            >
              Process batch
            </Button>
            <Button
              variant="secondary"
              disabled={Boolean(busy)}
              onClick={() =>
                void run("/admin/jobs/reconcile", "Lifecycle reconciliation")
              }
            >
              Reconcile
            </Button>
            <Button
              variant="secondary"
              disabled={Boolean(busy)}
              onClick={() =>
                void run("/admin/jobs/reminders", "Reminder enqueue")
              }
            >
              Enqueue reminders
            </Button>
          </div>
        </div>
        <div className="mt-4">
          <DataTable
            page={outbox.data}
            loading={outbox.loading}
            columns={[
              { label: "Event", keys: ["eventType"] },
              { label: "Aggregate", keys: ["aggregateType"] },
              {
                label: "Status",
                keys: ["status"],
                render: (row) => <StatusCell row={row} />,
              },
              { label: "Attempts", keys: ["attempts"] },
              {
                label: "Available",
                keys: ["availableAt"],
                render: (row) => formatDhaka(row.availableAt),
              },
              {
                label: "Action",
                keys: ["id"],
                render: (row) =>
                  row.status === "FAILED" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        void run(
                          `/admin/jobs/outbox/${String(row.id)}/retry`,
                          "Retry event",
                        )
                      }
                    >
                      Retry
                    </Button>
                  ) : (
                    <Status value={String(row.status)} />
                  ),
              },
            ]}
          />
        </div>
      </section>
      <section className="mt-6">
        <h2 className="mb-3 text-xl font-black">Safe audit trail</h2>
        <DataTable
          page={audit.data}
          loading={audit.loading}
          columns={[
            { label: "Action", keys: ["action"] },
            { label: "Entity", keys: ["entityType"] },
            { label: "Entity ID", keys: ["entityId"] },
            { label: "Actor", keys: ["actorUserId"] },
            {
              label: "At",
              keys: ["createdAt"],
              render: (row) => formatDhaka(row.createdAt),
            },
          ]}
        />
      </section>
    </>
  );
}
