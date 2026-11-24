"use client";

import { use, useState } from "react";
import { toast } from "sonner";
import { ErrorBox, PageHeader } from "@/components/page";
import { Button, Empty } from "@/components/ui";
import { DetailPageSkeleton } from "@/components/skeletons";
import { type Json } from "@/lib/admin";
import { useResource } from "@/lib/use-resource";
import { formatDhaka, idempotencyKey } from "@/lib/utils";
import { api, message } from "@/lib/api";

export default function Conversation({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const conversation = useResource<Json>(`/communications/conversations/${id}`),
    messages = useResource<{ items: Json[]; nextCursor?: string }>(
      `/communications/conversations/${id}/messages?pageSize=100`,
    );
  if (conversation.loading) return <DetailPageSkeleton />;
  if (conversation.error || !conversation.data)
    return (
      <ErrorBox message={conversation.error || "Conversation not found"} />
    );
  return (
    <>
      <PageHeader
        eyebrow="PRIVATE CONVERSATION"
        title={String(conversation.data.subject ?? "Operations conversation")}
        description="Message content is private and is not copied into audit metadata."
      />
      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="panel p-5">
          <div className="grid gap-4">
            {(messages.data?.items ?? []).map((item) => (
              <div
                key={String(item.id)}
                className="max-w-3xl rounded-xl border p-4"
              >
                <p className="whitespace-pre-wrap text-sm">
                  {String(item.body)}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {String(item.senderRole ?? item.senderType ?? "Participant")}{" "}
                  · {formatDhaka(item.createdAt)}
                </p>
              </div>
            ))}
            {!messages.loading && !messages.data?.items.length && (
              <Empty label="No messages" />
            )}
          </div>
        </div>
        <div className="panel h-fit p-5">
          <h2 className="section-title">Reply as operations</h2>
          <ReplyForm conversationId={id} onDone={() => messages.reload()} />
        </div>
      </div>
    </>
  );
}

function ReplyForm({
  conversationId,
  onDone,
}: {
  conversationId: string;
  onDone: () => Promise<unknown>;
}) {
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="grid gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        setBusy(true);
        setError("");
        try {
          const sent = await api<Json>(
            `/communications/conversations/${conversationId}/messages`,
            {
              method: "POST",
              body: JSON.stringify({
                body,
                idempotencyKey: idempotencyKey(`message:${conversationId}`),
              }),
            },
          );
          if (file)
            await api(
              `/communications/conversations/${conversationId}/messages/${String(sent.id)}/attachments`,
              {
                method: "POST",
                headers: {
                  "content-type": file.type,
                  "x-file-name": file.name,
                },
                body: file,
              },
            );
          toast.success(
            file ? "Reply and private attachment sent" : "Reply sent",
          );
          setBody("");
          setFile(null);
          form.reset();
          await onDone();
        } catch (cause) {
          setError(message(cause));
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="label">
        Message
        <textarea
          className="field min-h-28"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          required
          maxLength={4000}
        />
      </label>
      <label className="label">
        Private image attachment (optional)
        <input
          className="field"
          type="file"
          accept="image/jpeg,image/png"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <small className="help">
          JPEG or PNG, validated by content; up to the backend file limit.
        </small>
      </label>
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      <Button disabled={busy}>{busy ? "Sending…" : "Send reply"}</Button>
    </form>
  );
}
