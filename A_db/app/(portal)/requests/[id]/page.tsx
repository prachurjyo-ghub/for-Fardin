"use client";
/* eslint-disable @next/next/no-location-assign-relative-destination */

import { use, useMemo, useState } from "react";
import { Download, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { ActionForm } from "@/components/action-form";
import { ErrorBox, PageHeader } from "@/components/page";
import { Badge, Button, Empty, Skeleton, Status } from "@/components/ui";
import { download, message } from "@/lib/api";
import { send, type Json } from "@/lib/admin";
import { useResource } from "@/lib/use-resource";
import { formatBdt, formatDhaka, idempotencyKey } from "@/lib/utils";

type RequestRecord = Json & {
  items?: Json[];
  attachments?: Json[];
  history?: Json[];
};
type Comparison = {
  request: Json;
  quotations: Json[];
  compatibilityDisclaimer: string;
};
type AssignmentData = { assignments?: Json[] } | Json[];
type SuggestionData = { request: Json; suggestions: Json[] };

const array = (value: unknown) =>
  Array.isArray(value) ? (value as Json[]) : [];
const shown = (value: unknown) =>
  value === null || value === undefined || value === "" ? "—" : String(value);

export default function RequestWorkspace({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const request = useResource<RequestRecord>(`/admin/requests/${id}`);
  const suggestions = useResource<SuggestionData>(
    `/admin/requests/${id}/suggestions`,
  );
  const assignments = useResource<AssignmentData>(
    `/admin/requests/${id}/assignments`,
  );
  const comparison = useResource<Comparison>(
    `/admin/requests/${id}/quotation-comparison`,
  );
  const [selected, setSelected] = useState<string[]>([]);
  const assignmentRows = Array.isArray(assignments.data)
    ? assignments.data
    : array(assignments.data?.assignments);
  const reloadAll = async () => {
    await Promise.all([
      request.reload(),
      suggestions.reload(),
      assignments.reload(),
      comparison.reload(),
    ]);
  };
  if (request.loading)
    return (
      <div className="grid gap-4">
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </div>
    );
  if (request.error || !request.data)
    return (
      <ErrorBox
        message={request.error || "Request was not found"}
        retry={() => void request.reload()}
      />
    );
  const row = request.data;
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="SOURCING WORKSPACE"
        title={shown(row.requestNumber)}
        description="Review requirements, distribute to eligible suppliers, compare immutable quotation revisions and publish an exact customer-facing commercial snapshot."
        action={<Status value={shown(row.status)} />}
      />
      <section className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="panel p-5">
          <h2 className="section-title">Request requirements</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Fact
              label="Request type"
              value={shown(row.requestType).replaceAll("_", " ")}
            />
            <Fact
              label="Credit eligibility"
              value={shown(row.creditStatus).replaceAll("_", " ")}
            />
            <Fact label="Priority" value={shown(row.urgency ?? row.priority)} />
            <Fact label="Needed by" value={formatDhaka(row.neededByAt)} />
            <Fact label="Created" value={formatDhaka(row.createdAt)} />
          </div>
          {row.listing && (
            <div className="mt-4 rounded-xl border bg-muted/30 p-4">
              <b>{shown((row.listing as Json).product?.name)}</b>
              <p className="mt-1 text-sm text-muted-foreground">
                {shown((row.listing as Json).listingClassification).replaceAll(
                  "_",
                  " ",
                )}{" "}
                · {formatBdt((row.listing as Json).unitPrice)} · Supplier{" "}
                {shown((row.targetBusiness as Json | undefined)?.displayName)}
              </p>
            </div>
          )}
          <div className="mt-5 grid gap-3">
            {array(row.items).map((item) => (
              <div className="rounded-xl border p-4" key={shown(item.id)}>
                <div className="flex justify-between gap-4">
                  <div>
                    <b>
                      #{shown(item.lineNumber)} ·{" "}
                      {shown(item.description ?? item.partName)}
                    </b>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Part {shown(item.partNumber)} · Category{" "}
                      {shown((item.category as Json | undefined)?.name)}
                    </p>
                  </div>
                  <Badge>{shown(item.quantity)} required</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="panel p-5">
          <h2 className="section-title">Customer & delivery</h2>
          <p className="mt-4 font-bold">
            {shown((row.customer as Json | undefined)?.fullName)}
          </p>
          <p className="text-sm text-muted-foreground">
            Sensitive details are visible only to operations.
          </p>
          <Snapshot title="Vehicle snapshot" value={row.vehicleSnapshot} />
          <Snapshot title="Delivery snapshot" value={row.deliverySnapshot} />
        </div>
      </section>
      <section className="panel p-5">
        <h2 className="section-title">Private attachments</h2>
        {array(row.attachments).length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {array(row.attachments).map((item) => (
              <Button
                key={shown(item.id)}
                variant="secondary"
                onClick={async () => {
                  try {
                    const blob = await download(
                      `/admin/requests/${id}/attachments/${shown(item.id)}`,
                    );
                    const url = URL.createObjectURL(blob);
                    window.open(url, "_blank", "noopener,noreferrer");
                    setTimeout(() => URL.revokeObjectURL(url), 60_000);
                  } catch (error) {
                    toast.error(message(error));
                  }
                }}
              >
                <Download size={15} />
                {shown(item.originalName ?? item.fileName)}
              </Button>
            ))}
          </div>
        ) : (
          <Empty label="No request photos" />
        )}
      </section>
      <section className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="panel p-5">
          <h2 className="section-title">Suggested suppliers</h2>
          <p className="help">
            Suggestions are deterministic and read-only. Missing inventory
            lowers confidence but does not disqualify a sourcing supplier.
          </p>
          {suggestions.error && <ErrorBox message={suggestions.error} />}
          <div className="mt-4 grid gap-3">
            {(suggestions.data?.suggestions ?? []).map((supplier) => (
              <label
                key={shown((supplier.business as Json)?.id)}
                className="flex cursor-pointer items-start gap-3 rounded-xl border p-4"
              >
                <input
                  className="mt-1"
                  type="checkbox"
                  checked={selected.includes(
                    shown((supplier.business as Json)?.id),
                  )}
                  onChange={(event) =>
                    setSelected((current) =>
                      event.target.checked
                        ? [...current, shown((supplier.business as Json)?.id)]
                        : current.filter(
                            (item) =>
                              item !== shown((supplier.business as Json)?.id),
                          ),
                    )
                  }
                />
                <div className="flex-1">
                  <b>{shown((supplier.business as Json)?.displayName)}</b>
                  <p className="text-sm text-muted-foreground">
                    {shown(supplier.explanation ?? supplier.reason)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {array(supplier.reasons).map((reason, index) => (
                      <Badge key={index}>{shown(reason.label ?? reason)}</Badge>
                    ))}
                  </div>
                </div>
                <b>{shown(supplier.score)}</b>
              </label>
            ))}
            {!suggestions.loading && !suggestions.data?.suggestions.length && (
              <Empty label="No eligible suppliers found" />
            )}
          </div>
        </div>
        <div className="panel p-5">
          <h2 className="section-title">Create assignments</h2>
          <ActionForm
            endpoint={`/admin/requests/${id}/assignments`}
            submit="Assign selected suppliers"
            confirm={`Assign ${selected.length} supplier(s)?`}
            fields={[
              {
                name: "responseDeadlineAt",
                label: "Future response deadline",
                type: "datetime-local",
                required: true,
              },
              {
                name: "overrideReason",
                label:
                  "Mismatch override reason (applies to selected suppliers)",
                type: "textarea",
                placeholder:
                  "Required only when overriding a category/location mismatch",
              },
            ]}
            transform={(values) => ({
              responseDeadlineAt: new Date(
                values.responseDeadlineAt,
              ).toISOString(),
              suppliers: selected.map((businessId) => ({
                businessId,
                ...(values.overrideReason
                  ? { overrideReason: values.overrideReason }
                  : {}),
              })),
            })}
            onDone={reloadAll}
          />
          <p className="help mt-3">
            Inactive or closed businesses can never be overridden.
          </p>
        </div>
      </section>
      <section className="panel p-5">
        <h2 className="section-title">Assignments</h2>
        <div className="mt-4 grid gap-3">
          {assignmentRows.map((assignment) => (
            <div
              key={shown(assignment.id)}
              className="grid gap-3 rounded-xl border p-4 lg:grid-cols-[1fr_auto]"
            >
              <div>
                <b>
                  {shown(
                    (assignment.business as Json | undefined)?.displayName ??
                      assignment.businessName ??
                      assignment.businessId,
                  )}
                </b>
                <div className="mt-2 flex gap-2">
                  <Status value={shown(assignment.status)} />
                  <Badge>
                    Deadline {formatDhaka(assignment.responseDeadlineAt)}
                  </Badge>
                </div>
                {array(assignment.clarifications).map((clarification) => (
                  <div
                    key={shown(clarification.id)}
                    className="mt-3 rounded-xl bg-muted p-3 text-sm"
                  >
                    <b>Supplier question</b>
                    <p className="my-2">{shown(clarification.question)}</p>
                    {clarification.reply ? (
                      <p className="text-muted-foreground">
                        Operations reply: {shown(clarification.reply)}
                      </p>
                    ) : (
                      <ActionForm
                        endpoint={`/admin/requests/${id}/assignments/${shown(assignment.id)}/clarifications/${shown(clarification.id)}/reply`}
                        submit="Reply to supplier"
                        fields={[
                          {
                            name: "reply",
                            label: "Operations reply",
                            type: "textarea",
                            required: true,
                          },
                        ]}
                        onDone={reloadAll}
                      />
                    )}
                  </div>
                ))}
              </div>
              {!["WITHDRAWN", "SKIPPED", "EXPIRED"].includes(
                shown(assignment.status),
              ) && (
                <ActionForm
                  endpoint={`/admin/requests/${id}/assignments/${shown(assignment.id)}/withdraw`}
                  submit="Withdraw"
                  confirm="Withdraw this supplier assignment? The history will be preserved."
                  fields={[
                    { name: "reason", label: "Audited reason", required: true },
                  ]}
                  onDone={reloadAll}
                />
              )}
            </div>
          ))}
          {!assignmentRows.length && <Empty label="No assignments yet" />}
        </div>
      </section>
      <QuotationWorkspace
        requestId={id}
        comparison={comparison.data}
        reload={reloadAll}
      />
      <section className="panel p-5">
        <h2 className="section-title">Customer-visible lifecycle</h2>
        <div className="mt-4 border-l pl-5">
          {array(row.history).map((event) => (
            <div
              key={shown(event.id)}
              className="relative pb-5 before:absolute before:-left-[25px] before:top-1 before:size-2 before:rounded-full before:bg-foreground"
            >
              <b>{shown(event.toStatus ?? event.status)}</b>
              <p className="text-sm text-muted-foreground">
                {formatDhaka(event.createdAt)}
                {event.note ? ` · ${shown(event.note)}` : ""}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function QuotationWorkspace({
  requestId,
  comparison,
  reload,
}: {
  requestId: string;
  comparison: Comparison | null;
  reload: () => Promise<void>;
}) {
  const [quoteId, setQuoteId] = useState("");
  const [selectedLines, setSelectedLines] = useState<string[]>([]);
  const [preview, setPreview] = useState<Json | null>(null);
  const quotes = useMemo(() => comparison?.quotations ?? [], [comparison]);
  const quote = useMemo(
    () => quotes.find((item) => item.id === quoteId),
    [quotes, quoteId],
  );
  const lines = array(quote?.items);
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-black">
          Quotation review & customer option
        </h2>
        <p className="help">
          <ShieldAlert className="mr-1 inline" size={14} />
          {comparison?.compatibilityDisclaimer ??
            "Compatibility must be reviewed; fit is not guaranteed."}
        </p>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <div className="panel p-5">
          <label className="label">
            Supplier revision
            <select
              className="field"
              value={quoteId}
              onChange={(event) => {
                setQuoteId(event.target.value);
                setSelectedLines([]);
                setPreview(null);
              }}
            >
              <option value="">Select submitted quotation</option>
              {quotes.map((item) => (
                <option key={shown(item.id)} value={shown(item.id)}>
                  {shown(item.quotationNumber)} · rev{" "}
                  {shown(item.revisionNumber)} · {shown(item.status)}
                </option>
              ))}
            </select>
          </label>
          {quote && (
            <>
              <div className="my-4 grid gap-3 sm:grid-cols-3">
                <Fact
                  label="Supplier subtotal"
                  value={formatBdt(quote.supplierSubtotal)}
                />
                <Fact
                  label="Preparation"
                  value={`${shown(quote.preparationTimeMin)} min`}
                />
                <Fact
                  label="Valid until"
                  value={formatDhaka(quote.validUntil)}
                />
              </div>
              <p className="mb-4 text-sm">{shown(quote.compatibilityNotes)}</p>
              <div className="grid gap-3">
                {lines.map((line) => (
                  <label
                    key={shown(line.id)}
                    className="flex cursor-pointer gap-3 rounded-xl border p-4"
                  >
                    <input
                      className="mt-1"
                      type="checkbox"
                      checked={selectedLines.includes(shown(line.id))}
                      onChange={(event) =>
                        setSelectedLines((current) =>
                          event.target.checked
                            ? [...current, shown(line.id)]
                            : current.filter((id) => id !== shown(line.id)),
                        )
                      }
                    />
                    <div className="flex-1">
                      <b>{shown(line.description)}</b>
                      <p className="text-sm text-muted-foreground">
                        {shown(line.brand)} · {shown(line.partNumber)} ·{" "}
                        {shown(line.condition)}
                      </p>
                      {line.alternativeToItemId && (
                        <Badge>Mutually exclusive alternative</Badge>
                      )}
                    </div>
                    <b>{formatBdt(line.supplierLineTotal)}</b>
                  </label>
                ))}
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <ActionForm
                  endpoint={`/admin/quotations/${quoteId}/clarifications`}
                  submit="Request clarification"
                  fields={[
                    {
                      name: "question",
                      label: "Question for supplier",
                      type: "textarea",
                      required: true,
                    },
                  ]}
                  onDone={reload}
                />
                <ActionForm
                  endpoint={`/admin/quotations/${quoteId}/reject`}
                  submit="Reject quotation"
                  confirm="Reject this quotation revision?"
                  fields={[
                    {
                      name: "reason",
                      label: "Rejection reason",
                      type: "textarea",
                      required: true,
                    },
                  ]}
                  onDone={reload}
                />
              </div>
            </>
          )}
        </div>
        <div className="panel p-5">
          <h3 className="section-title">Prepare pricing snapshot</h3>
          <p className="help">
            Totals shown after submission are calculated by the server. BDT uses
            two-decimal, half-up rounding.
          </p>
          {quoteId ? (
            <ActionForm
              endpoint={`/admin/requests/${requestId}/options`}
              submit="Calculate exact option"
              fields={[
                {
                  name: "platformMargin",
                  label: "Platform margin (BDT)",
                  type: "number",
                  required: true,
                  defaultValue: 0,
                },
                {
                  name: "deliveryCharge",
                  label: "Delivery charge (BDT)",
                  type: "number",
                  required: true,
                  defaultValue: 0,
                },
                {
                  name: "priorityCharge",
                  label: "Priority charge (BDT)",
                  type: "number",
                  required: true,
                  defaultValue: 0,
                },
                {
                  name: "validUntil",
                  label: "Customer validity deadline",
                  type: "datetime-local",
                  required: true,
                },
                {
                  name: "customerNotes",
                  label: "Customer-safe note",
                  type: "textarea",
                },
                {
                  name: "internalNotes",
                  label: "Internal note",
                  type: "textarea",
                },
              ]}
              transform={(values) => ({
                quotationId: quoteId,
                quotationItemIds: selectedLines,
                platformMargin: values.platformMargin,
                deliveryCharge: values.deliveryCharge,
                priorityCharge: values.priorityCharge,
                validUntil: new Date(values.validUntil).toISOString(),
                customerNotes: values.customerNotes || null,
                internalNotes: values.internalNotes || null,
              })}
              onDone={(result) => {
                setPreview(result as Json);
                return reload();
              }}
            />
          ) : (
            <Empty label="Choose a quotation revision" />
          )}
        </div>
      </div>
      {preview && (
        <div className="panel border-success p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow">SERVER-CALCULATED PREVIEW</p>
              <h3 className="text-xl font-black">
                {shown(preview.optionNumber)} · revision{" "}
                {shown(preview.revisionNumber)}
              </h3>
            </div>
            <Status value={shown(preview.status)} />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            <Fact
              label="Supplier cost (internal)"
              value={formatBdt(preview.supplierSubtotal)}
            />
            <Fact
              label="Margin (internal)"
              value={formatBdt(preview.platformMargin)}
            />
            <Fact
              label="Customer items"
              value={formatBdt(preview.customerItemsTotal)}
            />
            <Fact
              label="Customer total"
              value={formatBdt(preview.customerTotal)}
            />
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              onClick={async () => {
                try {
                  const result = await send<Json>(
                    `/admin/options/${shown(preview.id)}/publish`,
                    "POST",
                    { expectedVersion: Number(preview.version) },
                  );
                  setPreview(result);
                  toast.success("Option published to customer");
                  await reload();
                } catch (error) {
                  toast.error(message(error));
                }
              }}
            >
              Publish exact snapshot
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  await send(
                    `/admin/options/${shown(preview.id)}/withdraw`,
                    "POST",
                    { reason: "Withdrawn during operational review" },
                  );
                  setPreview(null);
                  await reload();
                } catch (error) {
                  toast.error(message(error));
                }
              }}
            >
              Withdraw
            </Button>
            {(preview.acceptance as Json | null)?.id && (
              <Button
                variant="secondary"
                onClick={async () => {
                  try {
                    const acceptance = preview.acceptance as Json;
                    const result = await send<{ order?: Json }>(
                      `/admin/acceptances/${shown(acceptance.id)}/orders`,
                      "POST",
                      {
                        idempotencyKey: idempotencyKey(
                          `acceptance:${shown(acceptance.id)}`,
                        ),
                      },
                    );
                    toast.success("Acceptance converted without repricing");
                    const order = result.order;
                    if (order?.id)
                      window.location.href = `/orders/${shown(order.id)}`;
                  } catch (error) {
                    toast.error(message(error));
                  }
                }}
              >
                Convert accepted option to order
              </Button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/60 p-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-bold">{value}</p>
    </div>
  );
}
function Snapshot({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="mt-4">
      <p className="text-xs font-bold uppercase text-muted-foreground">
        {title}
      </p>
      <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-muted p-3 text-xs">
        {value ? JSON.stringify(value, null, 2) : "Not supplied"}
      </pre>
    </div>
  );
}
