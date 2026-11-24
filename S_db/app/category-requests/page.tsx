"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Panel, PanelHead } from "@/components/shared/panel";
import { PortalButton } from "@/components/shared/portal-button";
import { PageSkeleton } from "@/components/shared/skeletons";
import { StatusBadge } from "@/components/shared/status-badge";
import { apiRequest, errorMessage } from "@/lib/services/auth";
import { useAuth } from "@/providers/auth-provider";

type CategoryRequest = {
  id: string;
  proposedName: string;
  description: string | null;
  justification: string;
  status: string;
  decisionReason: string | null;
  createdAt: string;
  approvedCategory: { name: string } | null;
};
type Page = { items: CategoryRequest[]; total: number };

export default function CategoryRequestsPage() {
  const { membership } = useAuth();
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const businessId = membership?.business.id;
  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      setPage(
        await apiRequest<Page>(
          "/supplier/subscriptions/category-requests?page=1&pageSize=50",
          { headers: { "x-business-id": businessId } },
        ),
      );
      setError("");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [businessId]);
  useEffect(() => {
    void load();
  }, [load]);
  if (loading) return <PageSkeleton />;
  return (
    <div>
      <PageHeader
        eyebrow="CATALOGUE GOVERNANCE"
        title="Category requests"
        description="Request a missing global category. Suppliers cannot create catalogue categories directly."
      />
      {error && (
        <p className="mb-4 rounded-xl border border-danger/30 bg-danger-bg p-3 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
        <Panel>
          <PanelHead title="Request a category" />
          <form
            className="space-y-4 p-5"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!membership) return;
              const form = event.currentTarget;
              setBusy(true);
              const values = Object.fromEntries(
                new FormData(form).entries(),
              ) as Record<string, string>;
              const body = {
                proposedName: values.proposedName,
                justification: values.justification,
                ...(values.proposedParentId
                  ? { proposedParentId: values.proposedParentId }
                  : {}),
                ...(values.description
                  ? { description: values.description }
                  : {}),
              };
              try {
                await apiRequest("/supplier/subscriptions/category-requests", {
                  method: "POST",
                  headers: { "x-business-id": membership.business.id },
                  body: JSON.stringify(body),
                });
                form.reset();
                toast.success("Category request submitted");
                await load();
              } catch (cause) {
                setError(errorMessage(cause));
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="block text-xs font-bold">
              Proposed name
              <input
                className="mt-2 h-11 w-full rounded-xl border border-line bg-surface px-3"
                name="proposedName"
                required
                maxLength={120}
              />
            </label>
            <label className="block text-xs font-bold">
              Optional parent category UUID
              <input
                className="mt-2 h-11 w-full rounded-xl border border-line bg-surface px-3"
                name="proposedParentId"
              />
            </label>
            <label className="block text-xs font-bold">
              Description
              <textarea
                className="mt-2 min-h-24 w-full rounded-xl border border-line bg-surface p-3"
                name="description"
              />
            </label>
            <label className="block text-xs font-bold">
              Why it is needed
              <textarea
                className="mt-2 min-h-24 w-full rounded-xl border border-line bg-surface p-3"
                name="justification"
                required
              />
            </label>
            <PortalButton disabled={busy}>
              {busy ? "Submitting…" : "Submit request"}
            </PortalButton>
          </form>
        </Panel>
        <Panel>
          <PanelHead title="Request history" />
          <div className="divide-y divide-line">
            {page?.items.length ? (
              page.items.map((item) => (
                <article className="p-5" key={item.id}>
                  <div className="flex justify-between gap-3">
                    <div>
                      <h2 className="font-bold">{item.proposedName}</h2>
                      <p className="mt-1 text-sm text-muted-text">
                        {item.justification}
                      </p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  {item.approvedCategory && (
                    <p className="mt-3 text-sm">
                      Available as <b>{item.approvedCategory.name}</b>.
                    </p>
                  )}
                  {item.decisionReason && (
                    <p className="mt-2 rounded-lg bg-canvas p-3 text-xs text-muted-text">
                      Operations: {item.decisionReason}
                    </p>
                  )}
                </article>
              ))
            ) : (
              <p className="p-8 text-center text-sm text-muted-text">
                No category requests yet.
              </p>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
