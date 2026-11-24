"use client";

import { ResourceList } from "@/components/resource-list";
import { StatusCell } from "@/components/page";
import { formatDhaka } from "@/lib/utils";

export default function MessagesPage() {
  return (
    <ResourceList
      eyebrow="COMMUNICATIONS"
      title="Operations conversations"
      description="Customer↔operations and supplier↔operations conversations remain isolated by backend authorization."
      endpoint="/communications/conversations"
      detailBase="/messages"
      filters={[
        {
          name: "type",
          label: "Linked record",
          options: ["REQUEST", "QUOTATION", "ORDER", "SUPPORT", "GENERAL"].map(
            (value) => ({ value, label: value }),
          ),
        },
      ]}
      columns={[
        { label: "Subject", keys: ["subject"] },
        {
          label: "Audience",
          keys: ["audience", "participantType"],
          render: (row) => (
            <StatusCell row={row} keys={["audience", "participantType"]} />
          ),
        },
        { label: "Unread", keys: ["unreadCount"] },
        {
          label: "Updated",
          keys: ["updatedAt", "lastMessageAt"],
          render: (row) => formatDhaka(row.updatedAt ?? row.lastMessageAt),
        },
      ]}
    />
  );
}
