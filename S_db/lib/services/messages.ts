import { apiFileRequest, apiRequest, errorMessage } from "@/lib/services/auth";
import type { Conversation, ConversationMessage } from "@/lib/types";

type ServiceResult<T> = { ok: true; data: T } | { ok: false; error: string };

type ApiConversation = {
  id: string;
  type: "REQUEST" | "QUOTATION" | "ORDER" | "SUPPORT" | "GENERAL";
  subject: string | null;
  reference: string | null;
  preview: string | null;
  unreadCount: number;
  lastMessageAt: string | null;
  createdAt: string;
};

type ApiMessage = {
  id: string;
  senderType: "CUSTOMER" | "SUPPLIER" | "ADMIN" | "SYSTEM";
  mine: boolean;
  body: string;
  sentAt: string;
  attachments: Array<{ id: string; fileName: string; mimeType: string }>;
};

const headers = (businessId: string) => ({ "x-business-id": businessId });
const date = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "No messages yet";

function mapConversation(
  item: ApiConversation,
  messages: ConversationMessage[] = [],
): Conversation {
  return {
    id: item.id,
    subject: item.subject ?? "Operations conversation",
    reference: item.reference ?? "Support",
    referenceType:
      item.type === "ORDER"
        ? "order"
        : item.type === "QUOTATION"
          ? "quotation"
          : "request",
    preview: item.preview ?? "No messages yet",
    unread: item.unreadCount,
    updatedAt: date(item.lastMessageAt ?? item.createdAt),
    messages,
  };
}

function mapMessage(item: ApiMessage): ConversationMessage {
  return {
    id: item.id,
    sender: item.mine
      ? "supplier"
      : item.senderType === "SYSTEM"
        ? "system"
        : "operations",
    body: item.body,
    sentAt: date(item.sentAt),
    attachments: item.attachments.map((attachment) => ({
      id: attachment.id,
      name: attachment.fileName,
      type: attachment.mimeType,
    })),
  };
}

async function getMessages(id: string, businessId: string) {
  const page = await apiRequest<{ items: ApiMessage[] }>(
    `/communications/conversations/${id}/messages?pageSize=100`,
    { headers: headers(businessId) },
  );
  return page.items.reverse().map(mapMessage);
}

export async function getConversations(
  businessId: string,
): Promise<Conversation[]> {
  const page = await apiRequest<{ items: ApiConversation[] }>(
    "/communications/conversations?pageSize=50",
    { headers: headers(businessId) },
  );
  return Promise.all(
    page.items.map(async (item) =>
      mapConversation(item, await getMessages(item.id, businessId)),
    ),
  );
}

export async function sendMessage(
  conversationId: string,
  body: string,
  businessId: string,
  file?: File,
): Promise<ServiceResult<Conversation>> {
  try {
    const message = await apiRequest<{ id: string }>(
      `/communications/conversations/${conversationId}/messages`,
      {
        method: "POST",
        headers: headers(businessId),
        body: JSON.stringify({ body, idempotencyKey: crypto.randomUUID() }),
      },
    );
    if (file) {
      await apiFileRequest(
        `/communications/conversations/${conversationId}/messages/${message.id}/attachments`,
        {
          method: "POST",
          headers: {
            ...headers(businessId),
            "content-type": file.type || "application/octet-stream",
            "x-file-name": file.name,
          },
          body: file,
        },
      );
    }
    const updated = (await getConversations(businessId)).find(
      (item) => item.id === conversationId,
    );
    return updated
      ? { ok: true, data: updated }
      : { ok: false, error: "Conversation not found" };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function markConversationRead(
  conversationId: string,
  businessId: string,
): Promise<ServiceResult<Conversation>> {
  try {
    await apiRequest(`/communications/conversations/${conversationId}/read`, {
      method: "POST",
      headers: headers(businessId),
      body: JSON.stringify({}),
    });
    const item = (await getConversations(businessId)).find(
      (value) => value.id === conversationId,
    );
    return item
      ? { ok: true, data: item }
      : { ok: false, error: "Conversation not found" };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function openMessageAttachment(
  conversationId: string,
  messageId: string,
  attachmentId: string,
  businessId: string,
) {
  const response = await apiFileRequest(
    `/communications/conversations/${conversationId}/messages/${messageId}/attachments/${attachmentId}`,
    { headers: headers(businessId) },
  );
  const url = URL.createObjectURL(await response.blob());
  window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
