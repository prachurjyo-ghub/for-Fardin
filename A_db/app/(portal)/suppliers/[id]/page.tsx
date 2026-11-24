"use client";

import { use, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ActionForm } from "@/components/action-form";
import {
  DetailGrid,
  FormDialog,
  FriendlyEmpty,
  MoreActions,
  SectionCard,
} from "@/components/management";
import { ErrorBox, PageHeader } from "@/components/page";
import { Button, Status } from "@/components/ui";
import { DetailPageSkeleton } from "@/components/skeletons";
import { message } from "@/lib/api";
import { send, type Json, type Page } from "@/lib/admin";
import { useResource } from "@/lib/use-resource";
import { formatBdt, formatDhaka } from "@/lib/utils";

const list = (value: unknown) =>
  Array.isArray(value) ? (value as Json[]) : [];
const show = (value: unknown) =>
  value == null || value === "" ? "—" : String(value);

function SupportedCategories({
  businessId,
  selected,
  categories,
  onDone,
}: {
  businessId: string;
  selected: string[];
  categories: Json[];
  onDone: () => Promise<unknown>;
}) {
  const [values, setValues] = useState(selected);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="grid gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError("");
        try {
          await send(
            `/admin/suppliers/${businessId}/supported-categories`,
            "PUT",
            { categories: values },
          );
          toast.success("Supported categories updated");
          await onDone();
        } catch (cause) {
          setError(message(cause));
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="grid max-h-72 gap-2 overflow-y-auto rounded-xl border p-3 sm:grid-cols-2">
        {categories.map((category) => {
          const slug = show(category.slug);
          return (
            <label
              key={slug}
              className="flex items-center gap-2 rounded-lg p-2 hover:bg-muted"
            >
              <input
                type="checkbox"
                checked={values.includes(slug)}
                onChange={(event) =>
                  setValues((current) =>
                    event.target.checked
                      ? [...current, slug]
                      : current.filter((value) => value !== slug),
                  )
                }
              />
              <span className="text-sm font-semibold">
                {show(category.name)}
              </span>
            </label>
          );
        })}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button disabled={busy}>{busy ? "Saving…" : "Save categories"}</Button>
    </form>
  );
}

export default function SupplierDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const business = useResource<Json>(`/admin/suppliers/${id}`);
  const invitations = useResource<Json[] | { items: Json[] }>(
    `/admin/suppliers/${id}/invitations`,
  );
  const subscriptions = useResource<Page>(
    `/admin/subscriptions?page=1&pageSize=50&businessId=${id}`,
  );
  const invoices = useResource<Page>(
    `/admin/subscriptions/invoices?page=1&pageSize=50&businessId=${id}`,
  );
  const audits = useResource<Page>(
    `/admin/operations/audit-logs?page=1&pageSize=50&entityId=${id}`,
  );
  const categories = useResource<Page>(
    "/admin/catalogue/categories?page=1&pageSize=100&isActive=true",
  );
  const wallet = useResource<Json>(`/admin/credits/wallets/${id}`);
  if (business.loading) return <DetailPageSkeleton />;
  if (business.error || !business.data)
    return (
      <ErrorBox
        message={business.error || "Supplier not found"}
        retry={() => void business.reload()}
      />
    );

  const row = business.data;
  const members = list(row.members);
  const invites = Array.isArray(invitations.data)
    ? invitations.data
    : (invitations.data?.items ?? []);
  const subscription =
    subscriptions.data?.items.find((item) =>
      ["ACTIVE", "SCHEDULED"].includes(show(item.effectiveStatus)),
    ) ?? subscriptions.data?.items[0];
  const openInvoice = invoices.data?.items.find((item) =>
    ["ISSUED", "PARTIALLY_PAID"].includes(show(item.status)),
  );
  const selectedCategories = Array.isArray(row.supportedCategories)
    ? row.supportedCategories.map(String)
    : [];
  const reload = async () => {
    await Promise.all([
      business.reload(),
      invitations.reload(),
      subscriptions.reload(),
      invoices.reload(),
      audits.reload(),
      wallet.reload(),
    ]);
  };

  return (
    <>
      <PageHeader
        eyebrow="SUPPLIER BUSINESS"
        title={show(row.displayName ?? row.legalName)}
        description={`Business code ${show(row.businessCode)} · Created ${formatDhaka(row.createdAt)}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Status value={show(row.status)} />
            <MoreActions>
              {show(row.status) === "DRAFT" && (
                <ActionForm
                  endpoint={`/admin/suppliers/${id}/status/submit-review`}
                  submit="Submit for review"
                  fields={[]}
                  onDone={reload}
                />
              )}
              {show(row.status) === "PENDING_REVIEW" && (
                <ActionForm
                  endpoint={`/admin/suppliers/${id}/status/activate`}
                  submit="Activate supplier"
                  fields={[]}
                  onDone={reload}
                />
              )}
              {show(row.status) === "ACTIVE" && (
                <ActionForm
                  endpoint={`/admin/suppliers/${id}/status/suspend`}
                  submit="Suspend business"
                  confirm="Suspend this business and revoke affected sessions?"
                  fields={[
                    {
                      name: "reason",
                      label: "Audited reason",
                      type: "textarea",
                      required: true,
                    },
                  ]}
                  onDone={reload}
                />
              )}
              {show(row.status) !== "CLOSED" && (
                <ActionForm
                  endpoint={`/admin/suppliers/${id}/status/disable`}
                  submit="Close business"
                  confirm="Close this business while retaining all history?"
                  fields={[
                    {
                      name: "reason",
                      label: "Reason",
                      type: "textarea",
                      required: true,
                    },
                  ]}
                  onDone={reload}
                />
              )}
            </MoreActions>
          </div>
        }
      />

      <div className="grid gap-5">
        <SectionCard
          title="Commission credit wallet"
          description="Prepaid credits are held by the supplier business and reserved only when a commercial order is confirmed."
          action={
            <Link href={`/finance/wallets/${id}`}>
              <Button variant="secondary">Open wallet ledger</Button>
            </Link>
          }
        >
          {wallet.error ? (
            <ErrorBox
              message={wallet.error}
              retry={() => void wallet.reload()}
            />
          ) : (
            <DetailGrid
              items={[
                { label: "Wallet status", value: show(wallet.data?.status) },
                {
                  label: "Available credits",
                  value: formatBdt(wallet.data?.availableCredit),
                },
                {
                  label: "Reserved credits",
                  value: formatBdt(wallet.data?.reservedCredit),
                },
                {
                  label: "Total prepaid",
                  value: formatBdt(wallet.data?.totalPrepaidBalance),
                },
              ]}
            />
          )}
        </SectionCard>
        <SectionCard
          title="Business information"
          description="Identity, contact details, locations, and supported catalogue areas."
          action={
            <FormDialog
              title="Edit business information"
              trigger={<Button variant="secondary">Edit</Button>}
            >
              <ActionForm
                endpoint={`/admin/suppliers/${id}`}
                method="PATCH"
                submit="Save business information"
                fields={[
                  {
                    name: "legalName",
                    label: "Legal name",
                    required: true,
                    defaultValue: show(row.legalName),
                  },
                  {
                    name: "displayName",
                    label: "Display name",
                    required: true,
                    defaultValue: show(row.displayName),
                  },
                  {
                    name: "tradeLicense",
                    label: "Trade licence",
                    defaultValue: row.tradeLicense
                      ? String(row.tradeLicense)
                      : "",
                  },
                  {
                    name: "email",
                    label: "Business email",
                    defaultValue: row.email ? String(row.email) : "",
                  },
                  {
                    name: "phone",
                    label: "Phone (E.164)",
                    defaultValue: row.phone ? String(row.phone) : "",
                  },
                ]}
                transform={(v) => ({
                  legalName: v.legalName,
                  displayName: v.displayName,
                  tradeLicense: v.tradeLicense || null,
                  email: v.email || null,
                  phone: v.phone || null,
                })}
                onDone={reload}
              />
            </FormDialog>
          }
        >
          <DetailGrid
            items={[
              { label: "Legal name", value: show(row.legalName) },
              { label: "Trade licence", value: show(row.tradeLicense) },
              { label: "Business email", value: show(row.email) },
              { label: "Phone", value: show(row.phone) },
              {
                label: "Service areas",
                value: Array.isArray(row.serviceAreas)
                  ? row.serviceAreas.join(", ") || "—"
                  : "—",
              },
              {
                label: "Locations",
                value: `${list(row.locations).length} configured`,
              },
            ]}
          />
          <div className="mt-6 border-t pt-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold">Supported categories</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedCategories.length
                    ? (categories.data?.items ?? [])
                        .filter((item) =>
                          selectedCategories.includes(show(item.slug)),
                        )
                        .map((item) => show(item.name))
                        .join(", ") || selectedCategories.join(", ")
                    : "No categories assigned yet."}
                </p>
              </div>
              <FormDialog
                title="Choose supported categories"
                trigger={
                  <Button size="sm" variant="secondary">
                    Manage categories
                  </Button>
                }
              >
                <SupportedCategories
                  businessId={id}
                  selected={selectedCategories}
                  categories={categories.data?.items ?? []}
                  onDone={reload}
                />
              </FormDialog>
            </div>
            {list(row.locations).length > 0 && (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {list(row.locations).map((location) => (
                  <div
                    key={show(location.id)}
                    className="rounded-xl border p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <b>{show(location.label)}</b>
                      <Status
                        value={location.isActive ? "ACTIVE" : "INACTIVE"}
                      />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[location.addressLine, location.area, location.city]
                        .filter(Boolean)
                        .map(String)
                        .join(", ") || "No address supplied"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Owner & access"
          description="Onboard the first owner, then manage each person from their access row."
          action={
            members.length === 0 ? (
              <div className="flex flex-wrap gap-2">
                <FormDialog
                  title="Create initial owner"
                  trigger={<Button>Create owner</Button>}
                >
                  <p className="mb-4 text-sm text-muted-foreground">
                    Recommended for immediate setup. The owner must change the
                    temporary password at first sign-in.
                  </p>
                  <ActionForm
                    endpoint={`/admin/suppliers/${id}/owner-account`}
                    submit="Create owner account"
                    confirm="Create this owner and require a password change at first sign-in?"
                    resetOnSuccess
                    fields={[
                      { name: "email", label: "Owner email", required: true },
                      { name: "fullName", label: "Full name", required: true },
                      { name: "phone", label: "Phone (E.164)" },
                      {
                        name: "temporaryPassword",
                        label: "Temporary password",
                        type: "password",
                        required: true,
                      },
                    ]}
                    transform={(v) => ({
                      email: v.email,
                      fullName: v.fullName,
                      phone: v.phone || undefined,
                      temporaryPassword: v.temporaryPassword,
                    })}
                    onDone={reload}
                  />
                </FormDialog>
                <FormDialog
                  title="Email secure setup link"
                  trigger={
                    <Button variant="secondary">Send invite instead</Button>
                  }
                >
                  <ActionForm
                    endpoint={`/admin/suppliers/${id}/invitations/owner`}
                    submit="Send owner invitation"
                    fields={[
                      { name: "email", label: "Owner email", required: true },
                    ]}
                    resetOnSuccess
                    onDone={reload}
                  />
                </FormDialog>
              </div>
            ) : undefined
          }
        >
          {members.length === 0 ? (
            <FriendlyEmpty
              title="No owner has been set up"
              detail="Create an owner now or send a secure setup invitation."
            />
          ) : (
            <div className="divide-y">
              {members.map((member) => (
                <div
                  key={show(member.id)}
                  className="grid gap-3 py-4 first:pt-0 last:pb-0 md:grid-cols-[1fr_auto] md:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <b>{show(member.user?.fullName ?? member.user?.email)}</b>
                      {member.isPrimary && <Status value="OWNER" />}
                      <Status value={show(member.user?.accountStatus)} />
                      {member.user?.mustChangePassword && (
                        <Status value="PASSWORD CHANGE REQUIRED" />
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {show(member.user?.email)}
                      {member.title ? ` · ${show(member.title)}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <FormDialog
                      title="Reset temporary password"
                      trigger={
                        <Button size="sm" variant="secondary">
                          Reset password
                        </Button>
                      }
                    >
                      <ActionForm
                        endpoint={`/admin/suppliers/${id}/members/${show(member.id)}/temporary-password`}
                        submit="Reset temporary password"
                        confirm="Reset this password and sign the member out everywhere?"
                        resetOnSuccess
                        fields={[
                          {
                            name: "temporaryPassword",
                            label: "New temporary password",
                            type: "password",
                            required: true,
                          },
                          {
                            name: "confirmTemporaryPassword",
                            label: "Confirm temporary password",
                            type: "password",
                            required: true,
                          },
                          {
                            name: "reason",
                            label: "Audited reason",
                            required: true,
                          },
                        ]}
                        validate={(v) =>
                          v.temporaryPassword === v.confirmTemporaryPassword
                            ? null
                            : "The temporary passwords do not match."
                        }
                        transform={(v) => ({
                          temporaryPassword: v.temporaryPassword,
                          reason: v.reason,
                        })}
                        onDone={reload}
                      />
                    </FormDialog>
                    <FormDialog
                      title={
                        show(member.user?.accountStatus) === "SUSPENDED"
                          ? "Reactivate account"
                          : "Suspend account"
                      }
                      trigger={
                        <Button size="sm" variant="secondary">
                          Manage access
                        </Button>
                      }
                    >
                      <ActionForm
                        endpoint={`/admin/suppliers/${id}/members/${show(member.id)}/account-status`}
                        submit={
                          show(member.user?.accountStatus) === "SUSPENDED"
                            ? "Reactivate account"
                            : "Suspend account"
                        }
                        confirm="Change this person's account status?"
                        fields={[
                          {
                            name: "reason",
                            label: "Audited reason",
                            required: true,
                          },
                        ]}
                        transform={(v) => ({
                          status:
                            show(member.user?.accountStatus) === "SUSPENDED"
                              ? "ACTIVE"
                              : "SUSPENDED",
                          reason: v.reason,
                        })}
                        onDone={reload}
                      />
                    </FormDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
          {invites.length > 0 && (
            <details className="mt-5 border-t pt-4">
              <summary className="cursor-pointer text-sm font-bold">
                Setup invitations ({invites.length})
              </summary>
              <div className="mt-3 grid gap-2">
                {invites.map((invite) => (
                  <div
                    key={show(invite.id)}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 p-3 text-sm"
                  >
                    <span>
                      {show(invite.email)} · expires{" "}
                      {formatDhaka(invite.expiresAt)}
                    </span>
                    <Status value={show(invite.status)} />
                  </div>
                ))}
              </div>
            </details>
          )}
        </SectionCard>

        <SectionCard
          title="Subscription"
          description="Current entitlement and billing position for this supplier."
          action={
            <Button asChild>
              <Link href={`/subscriptions?view=enrollments&businessId=${id}`}>
                {subscription ? "Manage or extend" : "Assign a plan"}
              </Link>
            </Button>
          }
        >
          {subscription ? (
            <DetailGrid
              items={[
                { label: "Plan", value: show(subscription.planNameSnapshot) },
                {
                  label: "Status",
                  value: <Status value={show(subscription.effectiveStatus)} />,
                },
                {
                  label: "Period",
                  value: `${formatDhaka(subscription.startsAt)} — ${formatDhaka(subscription.endsAt)}`,
                },
                {
                  label: "Price",
                  value: formatBdt(subscription.priceSnapshot),
                },
                {
                  label: "Invoice",
                  value: show(subscription.invoice?.invoiceNumber),
                },
                {
                  label: "Outstanding",
                  value: openInvoice
                    ? formatBdt(openInvoice.outstandingAmount)
                    : "None",
                },
              ]}
            />
          ) : (
            <FriendlyEmpty
              title="No subscription assigned"
              detail="Assign a paid plan or, when authorized, grant complimentary access."
            />
          )}
        </SectionCard>

        <SectionCard
          title="Activity"
          description="Recent audited changes. Open an event to inspect its system context."
        >
          {!audits.data?.items.length ? (
            <FriendlyEmpty
              title="No activity yet"
              detail="Audited supplier changes will appear here."
            />
          ) : (
            <div className="divide-y">
              {audits.data.items.map((item) => (
                <details
                  key={show(item.id ?? item.requestId)}
                  className="py-3 first:pt-0 last:pb-0"
                >
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold">
                        {show(item.action)
                          .replaceAll("_", " ")
                          .toLowerCase()
                          .replace(/^./, (c) => c.toUpperCase())}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDhaka(item.createdAt)}
                      </span>
                    </div>
                  </summary>
                  <div className="mt-3 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                    <p>Entity: {show(item.entityType)}</p>
                    <p>Actor: {show(item.actorUserId)}</p>
                    {item.metadata != null && (
                      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(item.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                </details>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </>
  );
}
