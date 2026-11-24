"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui";
import { send, type Json, type Page } from "@/lib/admin";
import { message } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { formatBdt } from "@/lib/utils";

export function SettlementComposer({
  onDone,
}: {
  onDone: () => Promise<unknown>;
}) {
  const overview = useResource<Page<Json>>(
    "/admin/finance/supplier-overview?page=1&pageSize=100",
  );
  const [selected, setSelected] = useState<
    Record<string, { businessId: string; amount: string }>
  >({});
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const payables: Array<Json & { businessId: string; businessName: string }> = (
    overview.data?.items ?? []
  ).flatMap((entry) =>
    ((entry.items as Json[] | undefined) ?? [])
      .filter((item) => Number(item.outstanding) > 0)
      .map((item) => ({
        ...item,
        businessId: String((entry.business as Json).id),
        businessName: String((entry.business as Json).displayName),
      })),
  );
  const selectedRows = payables.filter((item) => selected[String(item.id)]);
  const oneBusiness =
    new Set(selectedRows.map((row) => row.businessId)).size <= 1;
  return (
    <div className="panel mt-5 p-5">
      <h2 className="section-title">Allocate supplier settlement</h2>
      <p className="help">
        Select outstanding payables for one supplier. Posting records an
        external payout and never moves money.
      </p>
      <div className="my-4 max-h-80 divide-y overflow-auto rounded-xl border">
        {payables.length ? (
          payables.map((item) => (
            <label
              className="grid grid-cols-[auto_1fr_140px] items-center gap-3 p-3"
              key={String(item.id)}
            >
              <input
                type="checkbox"
                checked={Boolean(selected[String(item.id)])}
                onChange={(event) =>
                  setSelected((current) => {
                    const next = { ...current };
                    if (event.target.checked)
                      next[String(item.id)] = {
                        businessId: item.businessId,
                        amount: String(item.outstanding),
                      };
                    else delete next[String(item.id)];
                    return next;
                  })
                }
              />
              <span>
                <b>{item.businessName}</b>
                <small className="block text-muted-foreground">
                  {String(item.orderNumber ?? item.orderId)} · outstanding{" "}
                  {formatBdt(item.outstanding)}
                </small>
              </span>
              <input
                className="field"
                type="number"
                min="0.01"
                step="0.01"
                value={
                  selected[String(item.id)]?.amount ?? String(item.outstanding)
                }
                disabled={!selected[String(item.id)]}
                onChange={(event) =>
                  setSelected((current) => ({
                    ...current,
                    [String(item.id)]: {
                      businessId: item.businessId,
                      amount: event.target.value,
                    },
                  }))
                }
                aria-label={`Allocation for ${String(item.id)}`}
              />
            </label>
          ))
        ) : (
          <p className="p-6 text-center text-sm text-muted-foreground">
            No eligible outstanding payables.
          </p>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="label">
          External method
          <input
            className="field"
            value={method}
            onChange={(event) => setMethod(event.target.value)}
          />
        </label>
        <label className="label">
          External reference
          <input
            className="field"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
          />
        </label>
      </div>
      <Button
        className="mt-4"
        disabled={
          busy || !selectedRows.length || !oneBusiness || !method || !reference
        }
        onClick={async () => {
          setBusy(true);
          try {
            await send("/admin/finance/settlements", "POST", {
              businessId: selectedRows[0].businessId,
              allocations: selectedRows.map((row) => ({
                payableId: row.id,
                amount: Number(selected[String(row.id)].amount),
              })),
              method,
              externalReference: reference,
              occurredAt: new Date().toISOString(),
              idempotencyKey: crypto.randomUUID(),
              note: null,
            });
            toast.success("External payout recorded");
            setSelected({});
            setMethod("");
            setReference("");
            await Promise.all([overview.reload(), onDone()]);
          } catch (cause) {
            toast.error(message(cause));
          } finally {
            setBusy(false);
          }
        }}
      >
        Record external payout
      </Button>
      {!oneBusiness && (
        <p className="mt-2 text-sm text-danger">
          Select payables from only one supplier.
        </p>
      )}
    </div>
  );
}
