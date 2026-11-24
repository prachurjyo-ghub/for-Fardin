"use client";

import { use } from "react";
import { ActionForm } from "@/components/action-form";
import { ErrorBox, PageHeader } from "@/components/page";
import { Badge, Empty, Skeleton, Status } from "@/components/ui";
import { type Json } from "@/lib/admin";
import { useResource } from "@/lib/use-resource";
import { formatBdt, formatDhaka, idempotencyKey } from "@/lib/utils";

const rows = (value: unknown) =>
  Array.isArray(value) ? (value as Json[]) : [];
const show = (value: unknown) =>
  value === null || value === undefined || value === "" ? "—" : String(value);
const bool = (value: string) => value === "true";

export default function OrderDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params),
    resource = useResource<Json>(`/admin/orders/${id}`);
  if (resource.loading)
    return (
      <div className="grid gap-4">
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </div>
    );
  if (resource.error || !resource.data)
    return (
      <ErrorBox
        message={resource.error || "Order not found"}
        retry={() => void resource.reload()}
      />
    );
  const order = resource.data,
    reload = () => resource.reload();
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="ORDER OPERATIONS"
        title={show(order.orderNumber)}
        description="Immutable accepted pricing, reservation state and fulfillment effects are separated from externally recorded financial activity."
        action={<Status value={show(order.status)} />}
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Fact label="Customer total" value={formatBdt(order.customerTotal)} />
        <Fact
          label="Supplier subtotal"
          value={formatBdt(order.supplierSubtotal)}
        />
        <Fact label="Platform margin" value={formatBdt(order.platformMargin)} />
        <Fact label="Delivery" value={formatBdt(order.deliveryCharge)} />
        <Fact label="Priority" value={formatBdt(order.priorityCharge)} />
      </section>
      <section className="panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="section-title">Commission reservation</h2>
            <p className="help">
              Commission uses the confirmed eligible item total and the rate
              snapshot stored when supplier credits were reserved.
            </p>
          </div>
          <Status
            value={show(
              (order.commissionReservation as Json | null)?.status ??
                "NOT RESERVED",
            )}
          />
        </div>
        {order.commissionReservation ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <Fact
              label="Eligible amount"
              value={formatBdt(order.commissionReservation.eligibleAmount)}
            />
            <Fact
              label="Rate snapshot"
              value={`${(Number(order.commissionReservation.commissionRateBps) / 100).toFixed(2)}%`}
            />
            <Fact
              label="Reserved commission"
              value={formatBdt(order.commissionReservation.commissionAmount)}
            />
            <Fact
              label="Reserved at"
              value={formatDhaka(order.commissionReservation.reservedAt)}
            />
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            No reservation is attached. This can be a legacy order or an order
            still waiting for supplier confirmation.
          </p>
        )}
      </section>
      <section className="panel overflow-hidden">
        <div className="border-b p-5">
          <h2 className="section-title">Items & reservations</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b bg-muted/60">
                <th className="p-4">Item</th>
                <th>Source</th>
                <th>Quantity</th>
                <th>Customer</th>
                <th>Supplier</th>
                <th>Reservation</th>
              </tr>
            </thead>
            <tbody>
              {rows(order.items).map((item) => (
                <tr key={show(item.id)} className="border-b last:border-0">
                  <td className="p-4">
                    <b>{show(item.description)}</b>
                    <p className="text-muted-foreground">
                      {show(item.brand)} · {show(item.partNumber)}
                    </p>
                  </td>
                  <td>
                    <Badge>{show(item.fulfillmentSource)}</Badge>
                  </td>
                  <td>{show(item.quantity)}</td>
                  <td>{formatBdt(item.customerLineTotal)}</td>
                  <td>{formatBdt(item.supplierLineTotal)}</td>
                  <td>
                    <Status
                      value={show(
                        (item.reservation as Json | null)?.status ?? "EXTERNAL",
                      )}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <div className="panel p-5">
          <h2 className="section-title">Fulfillment timeline</h2>
          <div className="mt-5 border-l pl-5">
            {rows(order.history).map((event) => (
              <div
                className="relative pb-5 before:absolute before:-left-[25px] before:top-1 before:size-2 before:rounded-full before:bg-foreground"
                key={show(event.id)}
              >
                <b>
                  {show(event.fromStatus)} → {show(event.toStatus)}
                </b>
                <p className="text-sm text-muted-foreground">
                  {formatDhaka(event.at)}
                  {event.note ? ` · ${show(event.note)}` : ""}
                </p>
              </div>
            ))}
          </div>
          <h3 className="mt-4 font-black">Delivery snapshot</h3>
          <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-muted p-4 text-xs">
            {JSON.stringify(order.delivery, null, 2)}
          </pre>
        </div>
        <div className="space-y-5">
          <div className="panel p-5">
            <h2 className="section-title">Next operational transition</h2>
            <ActionForm
              endpoint={`/admin/orders/${id}/transitions`}
              submit="Record transition"
              confirm="Record this operational transition? Inventory consumption may occur at pickup and effects are exactly-once."
              fields={[
                {
                  name: "toStatus",
                  label: "Next status",
                  type: "select",
                  options: [
                    "PICKED_UP",
                    "IN_DELIVERY",
                    "DELIVERED",
                    "COMPLETED",
                  ].map((value) => ({
                    value,
                    label: value.replaceAll("_", " "),
                  })),
                },
                {
                  name: "note",
                  label: "Evidence / verification reference",
                  type: "textarea",
                  required: true,
                },
                { name: "courierName", label: "Courier name" },
                { name: "trackingReference", label: "Tracking reference" },
              ]}
              transform={(v) => ({
                toStatus: v.toStatus,
                note: v.note || null,
                courierName: v.courierName || null,
                trackingReference: v.trackingReference || null,
              })}
              onDone={reload}
            />
          </div>
          <div className="panel p-5">
            <h2 className="section-title">Report failure</h2>
            <ActionForm
              endpoint={`/admin/orders/${id}/failures`}
              submit="Record failure"
              confirm="Record this failure? Reservation release occurs only when explicitly selected."
              fields={[
                { name: "code", label: "Failure code", required: true },
                {
                  name: "reason",
                  label: "Audited reason",
                  type: "textarea",
                  required: true,
                },
                {
                  name: "releaseReservations",
                  label: "Release reservations",
                  type: "select",
                  options: [
                    { label: "No", value: "false" },
                    { label: "Yes — release exactly once", value: "true" },
                  ],
                },
              ]}
              transform={(v) => ({
                ...v,
                releaseReservations: bool(v.releaseReservations),
              })}
              onDone={reload}
            />
          </div>
        </div>
      </section>
      {show((order.urgent as Json | undefined)?.eligibility) !==
        "NOT_APPLICABLE" && (
        <section className="panel p-5">
          <h2 className="section-title">Conditional urgent eligibility</h2>
          <p className="help">
            This records an operational assessment; it never promises universal
            30–60-minute delivery or changes accepted charges.
          </p>
          <ActionForm
            endpoint={`/admin/orders/${id}/urgent-eligibility`}
            submit="Record urgent assessment"
            fields={[
              {
                name: "eligibility",
                label: "Eligibility",
                type: "select",
                options: ["PENDING", "ELIGIBLE", "UNAVAILABLE"].map(
                  (value) => ({ label: value, value }),
                ),
              },
              {
                name: "basis",
                label: "Audited basis",
                type: "textarea",
                required: true,
              },
              {
                name: "estimatedWindowStart",
                label: "Estimated start",
                type: "datetime-local",
              },
              {
                name: "estimatedWindowEnd",
                label: "Estimated end",
                type: "datetime-local",
              },
              {
                name: "targetDeadlineAt",
                label: "Target deadline",
                type: "datetime-local",
              },
            ]}
            transform={(v) => ({
              eligibility: v.eligibility,
              basis: v.basis,
              estimatedWindowStart: v.estimatedWindowStart
                ? new Date(v.estimatedWindowStart).toISOString()
                : null,
              estimatedWindowEnd: v.estimatedWindowEnd
                ? new Date(v.estimatedWindowEnd).toISOString()
                : null,
              targetDeadlineAt: v.targetDeadlineAt
                ? new Date(v.targetDeadlineAt).toISOString()
                : null,
            })}
            onDone={reload}
          />
        </section>
      )}
      <DecisionQueues order={order} id={id} reload={reload} />
      <FinancialActions id={id} reload={reload} />
    </div>
  );
}

function DecisionQueues({
  order,
  id,
  reload,
}: {
  order: Json;
  id: string;
  reload: () => Promise<unknown>;
}) {
  const cancellations = rows(order.cancellationRequests),
    returned = order.return as Json | null;
  return (
    <section className="grid gap-5 xl:grid-cols-2">
      <div className="panel p-5">
        <h2 className="section-title">Cancellation decisions</h2>
        {cancellations.map((item) => (
          <div className="mt-4 rounded-xl border p-4" key={show(item.id)}>
            <Status value={show(item.status)} />
            <p className="my-3 text-sm">{show(item.reason)}</p>
            {show(item.status) === "PENDING" && (
              <ActionForm
                endpoint={`/admin/orders/${id}/cancellations/${show(item.id)}/decision`}
                submit="Record decision"
                confirm="Review stock and financial effects before continuing."
                fields={[
                  {
                    name: "decision",
                    label: "Decision",
                    type: "select",
                    options: [
                      { label: "Approve", value: "APPROVED" },
                      { label: "Reject", value: "REJECTED" },
                    ],
                  },
                  {
                    name: "reason",
                    label: "Decision reason",
                    type: "textarea",
                    required: true,
                  },
                ]}
                onDone={reload}
              />
            )}
          </div>
        ))}
        {!cancellations.length && <Empty label="No cancellation requests" />}
      </div>
      <div className="panel p-5">
        <h2 className="section-title">Return & inspection</h2>
        {returned ? (
          <div className="mt-4">
            <Status value={show(returned.status)} />
            <p className="my-3 text-sm">{show(returned.reason)}</p>
            {show(returned.status) === "REQUESTED" && (
              <ActionForm
                endpoint={`/admin/orders/${id}/returns/${show(returned.id)}/decision`}
                submit="Record return decision"
                fields={[
                  {
                    name: "decision",
                    label: "Decision",
                    type: "select",
                    options: [
                      { label: "Approve", value: "APPROVED" },
                      { label: "Reject", value: "REJECTED" },
                    ],
                  },
                  {
                    name: "reason",
                    label: "Reason",
                    type: "textarea",
                    required: true,
                  },
                  {
                    name: "refundRequired",
                    label: "Refund review required",
                    type: "select",
                    options: [
                      { label: "No", value: "false" },
                      { label: "Yes", value: "true" },
                    ],
                  },
                ]}
                transform={(v) => ({
                  ...v,
                  refundRequired: bool(v.refundRequired),
                })}
                onDone={reload}
              />
            )}{" "}
            {show(returned.status) === "APPROVED" && (
              <ActionForm
                endpoint={`/admin/orders/${id}/returns/${show(returned.id)}/receive`}
                submit="Confirm physical receipt"
                fields={[
                  { name: "note", label: "Receipt note", type: "textarea" },
                ]}
                transform={(v) => ({ note: v.note || null })}
                onDone={reload}
              />
            )}{" "}
            {show(returned.status) === "RECEIVED" && (
              <ActionForm
                endpoint={`/admin/orders/${id}/returns/${show(returned.id)}/inspect`}
                submit="Record inspection"
                confirm="Stock is restored only if restock is explicitly selected after inspection."
                fields={[
                  {
                    name: "note",
                    label: "Inspection findings",
                    type: "textarea",
                    required: true,
                  },
                  {
                    name: "restock",
                    label: "Restore inspected stock",
                    type: "select",
                    options: [
                      { label: "No", value: "false" },
                      { label: "Yes", value: "true" },
                    ],
                  },
                  {
                    name: "refundRequired",
                    label: "Refund required",
                    type: "select",
                    options: [
                      { label: "No", value: "false" },
                      { label: "Yes", value: "true" },
                    ],
                  },
                ]}
                transform={(v) => ({
                  note: v.note,
                  restock: bool(v.restock),
                  refundRequired: bool(v.refundRequired),
                })}
                onDone={reload}
              />
            )}
          </div>
        ) : (
          <Empty label="No return request" />
        )}
      </div>
    </section>
  );
}

function FinancialActions({
  id,
  reload,
}: {
  id: string;
  reload: () => Promise<unknown>;
}) {
  return (
    <section>
      <div className="mb-4">
        <h2 className="text-2xl font-black">External financial records</h2>
        <p className="help">
          These actions record activity performed outside PartsArc. They do not
          move money.
        </p>
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <div className="panel p-5">
          <h3 className="section-title">Issue invoice</h3>
          <ActionForm
            endpoint={`/admin/finance/orders/${id}/invoices`}
            submit="Issue immutable invoice"
            confirm="Issue the invoice from the order snapshot?"
            fields={[
              {
                name: "dueAt",
                label: "Due date (optional)",
                type: "datetime-local",
              },
            ]}
            transform={(v) => ({
              dueAt: v.dueAt ? new Date(v.dueAt).toISOString() : null,
            })}
            onDone={reload}
          />
        </div>
        <div className="panel p-5">
          <h3 className="section-title">Record customer receipt</h3>
          <ActionForm
            endpoint={`/admin/finance/orders/${id}/payments`}
            submit="Record external receipt"
            confirm="Confirm that this payment already occurred externally."
            fields={[
              {
                name: "amount",
                label: "Amount (BDT)",
                type: "number",
                required: true,
              },
              { name: "method", label: "External method", required: true },
              {
                name: "externalReference",
                label: "External reference",
                required: true,
              },
              {
                name: "occurredAt",
                label: "Occurred at",
                type: "datetime-local",
                required: true,
              },
              { name: "note", label: "Safe note", type: "textarea" },
            ]}
            transform={(v) => ({
              ...v,
              occurredAt: new Date(v.occurredAt).toISOString(),
              idempotencyKey: idempotencyKey(
                `payment:${id}:${v.externalReference}`,
              ),
              note: v.note || null,
            })}
            onDone={reload}
          />
        </div>
        <div className="panel p-5">
          <h3 className="section-title">Create supplier payable</h3>
          <p className="help mb-4">
            Eligibility is derived from fulfillment; amounts cannot be supplied
            by the browser.
          </p>
          <ActionForm
            endpoint={`/admin/finance/orders/${id}/payables`}
            submit="Derive payable"
            confirm="Create the supplier liability from the immutable order?"
            fields={[]}
            onDone={reload}
          />
        </div>
      </div>
    </section>
  );
}
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-lg font-black">{value}</p>
    </div>
  );
}
