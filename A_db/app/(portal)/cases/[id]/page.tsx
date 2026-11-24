"use client";

import { use } from "react";
import { ActionForm } from "@/components/action-form";
import { DetailPageSkeleton } from "@/components/skeletons";
import { ErrorBox, PageHeader } from "@/components/page";
import { Status } from "@/components/ui";
import { type Json } from "@/lib/admin";
import { useResource } from "@/lib/use-resource";
import { formatDhaka } from "@/lib/utils";

export default function CaseDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const resource = useResource<Json>(`/admin/operations/cases/${id}`);
  if (resource.loading) return <DetailPageSkeleton />;
  if (resource.error || !resource.data)
    return <ErrorBox message={resource.error || "Case not found"} />;
  const row = resource.data;
  return (
    <>
      <PageHeader
        eyebrow="OPERATIONAL CASE"
        title={String(row.caseNumber)}
        description={String(row.title)}
        action={<Status value={String(row.status)} />}
      />
      <div className="grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
        <div className="panel p-5">
          <h2 className="section-title">Case history</h2>
          <div className="mt-3 divide-y">
            {(row.history as Json[]).map((event) => (
              <div className="py-4" key={String(event.id)}>
                <div className="flex justify-between gap-3">
                  <Status value={String(event.toStatus)} />
                  <span className="text-xs text-muted-foreground">
                    {formatDhaka(event.createdAt)}
                  </span>
                </div>
                <p className="mt-2 text-sm">{String(event.note)}</p>
                <p className="help">
                  {String(event.actorUser?.fullName ?? event.actorUserId)}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="panel h-fit p-5">
          <h2 className="section-title">Update case</h2>
          <ActionForm
            endpoint={`/admin/operations/cases/${id}`}
            method="PATCH"
            submit="Update case"
            confirm="Record this case status and history event?"
            fields={[
              {
                name: "status",
                label: "Status",
                type: "select",
                options: ["OPEN", "IN_REVIEW", "RESOLVED"].map((value) => ({
                  label: value.replaceAll("_", " "),
                  value,
                })),
              },
              { name: "assignedToUserId", label: "Admin assignee UUID" },
              {
                name: "note",
                label: "History note",
                type: "textarea",
                required: true,
              },
              {
                name: "resolution",
                label: "Resolution (required when resolved)",
                type: "textarea",
              },
            ]}
            transform={(v) => ({
              status: v.status,
              assignedToUserId: v.assignedToUserId || null,
              note: v.note,
              resolution: v.resolution || null,
            })}
            onDone={() => resource.reload()}
          />
        </div>
      </div>
    </>
  );
}
