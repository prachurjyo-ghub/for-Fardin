"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  HiArrowLeft,
  HiOutlinePaperClip,
  HiPaperAirplane,
} from "react-icons/hi2";
import { EmptyState } from "@/components/shared/empty-state";
import { FormControl, SearchControl } from "@/components/shared/form-control";
import { PageHeader } from "@/components/shared/page-header";
import { PortalButton } from "@/components/shared/portal-button";
import { MessagesSkeleton } from "@/components/shared/skeletons";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import {
  getConversations,
  markConversationRead,
  openMessageAttachment,
  sendMessage,
} from "@/lib/services/messages";
import type { Conversation } from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";

export default function MessagesPage() {
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const pollState = useRef({ failures: 0, retryAfter: 0, inFlight: false });
  const { membership } = useAuth();
  const businessId = membership?.business.id;

  const load = useCallback(
    async (initial = false) => {
      if (!businessId) return;
      if (initial) setLoading(true);
      try {
        setConversations(await getConversations(businessId));
        return true;
      } catch {
        if (initial) toast.error("Messages could not be loaded.");
        return false;
      } finally {
        if (initial) setLoading(false);
      }
    },
    [businessId],
  );

  useEffect(() => {
    const poll = async (initial = false) => {
      const state = pollState.current;
      if (
        state.inFlight ||
        document.visibilityState !== "visible" ||
        (!initial && Date.now() < state.retryAfter)
      )
        return;
      state.inFlight = true;
      try {
        if (await load(initial)) {
          state.failures = 0;
          state.retryAfter = 0;
        } else {
          state.failures += 1;
          const backoff = Math.min(
            300_000,
            20_000 * 2 ** Math.min(state.failures, 4),
          );
          state.retryAfter =
            Date.now() + backoff + Math.floor(Math.random() * 5_000);
        }
      } finally {
        state.inFlight = false;
      }
    };
    void poll(true);
    const timer = window.setInterval(() => void poll(), 20_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void poll();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) =>
      `${c.subject} ${c.reference} ${c.preview}`.toLowerCase().includes(q),
    );
  }, [conversations, search]);

  const active = conversations.find((c) => c.id === activeId) ?? null;

  async function selectConversation(id: string) {
    if (!businessId) return;
    setActiveId(id);
    setMobileShowThread(true);
    const result = await markConversationRead(id, businessId);
    if (result.ok) {
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? result.data : c)),
      );
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId || !draft.trim() || !businessId || sending) return;
    setSending(true);
    const result = await sendMessage(
      activeId,
      draft.trim(),
      businessId,
      file ?? undefined,
    );
    if (result.ok) {
      setConversations((prev) =>
        prev.map((c) => (c.id === activeId ? result.data : c)),
      );
      setDraft("");
      setFile(null);
      toast.success("Message sent.");
    } else toast.error(result.error);
    setSending(false);
  }

  if (loading) return <MessagesSkeleton />;

  return (
    <div>
      <PageHeader
        eyebrow="BUSINESS"
        title="Messages"
        description="Keep request clarifications and order updates connected to the relevant RFQ or order."
      />

      <div className="portal-panel grid min-h-[65vh] overflow-hidden lg:grid-cols-[320px_1fr]">
        <aside
          className={cn(
            "flex flex-col border-b border-line lg:border-b-0 lg:border-r",
            mobileShowThread && "hidden lg:flex",
          )}
        >
          <div className="border-b border-line p-3">
            <SearchControl
              className="w-full"
              placeholder="Search conversations"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex-1 overflow-auto">
            {filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => selectConversation(c.id)}
                className={cn(
                  "w-full border-b border-line px-4 py-3.5 text-left transition hover:bg-canvas",
                  activeId === c.id && "bg-canvas",
                )}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-bold text-ink">
                    {c.subject}
                  </span>
                  {c.unread > 0 ? (
                    <span className="rounded-full bg-blue px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {c.unread}
                    </span>
                  ) : null}
                </div>
                <div className="mb-1 flex items-center gap-2">
                  <StatusBadge
                    status={
                      c.referenceType === "request"
                        ? "Request"
                        : c.referenceType === "quotation"
                          ? "Quotation"
                          : "Order"
                    }
                  />
                  <span className="text-[11px] font-bold text-blue">
                    {c.reference}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-text">{c.preview}</p>
                <p className="mt-1 text-[10px] text-muted-text">
                  {c.updatedAt}
                </p>
              </button>
            ))}
            {!filtered.length ? (
              <p className="p-6 text-center text-sm text-muted-text">
                No conversations match your search.
              </p>
            ) : null}
          </div>
        </aside>

        <section
          className={cn(
            "flex min-h-[50vh] flex-col",
            !mobileShowThread && "hidden lg:flex",
          )}
        >
          {!active ? (
            <EmptyState
              title="Select a conversation"
              description="Open a request or order thread from the list to reply, attach files and clear unread messages."
              className="min-h-full"
            />
          ) : (
            <>
              <div className="flex items-start gap-3 border-b border-line px-4 py-4 sm:px-5">
                <button
                  type="button"
                  className="mt-1 grid size-9 place-items-center rounded-[10px] border border-line lg:hidden"
                  onClick={() => setMobileShowThread(false)}
                  aria-label="Back to conversations"
                >
                  <HiArrowLeft />
                </button>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-heading text-base font-bold text-ink">
                    {active.subject}
                  </h2>
                  <p className="mt-1 text-xs text-muted-text">
                    Linked {active.referenceType}:{" "}
                    <span className="font-bold text-blue">
                      {active.reference}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-auto bg-canvas/40 p-4 sm:p-5">
                {active.messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "max-w-[85%] rounded-2xl border border-line px-3.5 py-3 text-sm",
                      m.sender === "supplier"
                        ? "ml-auto bg-blue text-white"
                        : m.sender === "system"
                          ? "mx-auto bg-surface text-center text-xs text-muted-text"
                          : "bg-surface text-ink",
                    )}
                  >
                    <p className="leading-relaxed">{m.body}</p>
                    {m.attachments?.length ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {m.attachments.map((a) => (
                          <button
                            key={a.name}
                            type="button"
                            className={cn(
                              "rounded-lg px-2 py-1 text-[11px] font-bold",
                              m.sender === "supplier"
                                ? "bg-white/15"
                                : "bg-blue-2 text-blue",
                            )}
                            onClick={() => {
                              if (!businessId) return;
                              void openMessageAttachment(
                                active.id,
                                m.id,
                                a.id,
                                businessId,
                              ).catch(() =>
                                toast.error("Attachment could not be opened."),
                              );
                            }}
                          >
                            {a.name}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <p
                      className={cn(
                        "mt-1.5 text-[10px]",
                        m.sender === "supplier"
                          ? "text-white/70"
                          : "text-muted-text",
                      )}
                    >
                      {m.sentAt}
                    </p>
                  </div>
                ))}
              </div>

              <form
                onSubmit={handleSend}
                className="flex items-center gap-2 border-t border-line p-3 sm:p-4"
              >
                <PortalButton
                  type="button"
                  size="sm"
                  aria-label="Attach file"
                  onClick={() => fileInput.current?.click()}
                >
                  <HiOutlinePaperClip />
                </PortalButton>
                <input
                  ref={fileInput}
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png"
                  onChange={(event) => {
                    const selected = event.target.files?.[0] ?? null;
                    if (selected && selected.size > 5 * 1024 * 1024) {
                      toast.error("Images must be 5 MiB or smaller.");
                      event.target.value = "";
                      return;
                    }
                    setFile(selected);
                  }}
                />
                <FormControl
                  className="min-w-0 flex-1"
                  placeholder={
                    file ? `Reply with ${file.name}` : "Write a reply…"
                  }
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <PortalButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={sending}
                >
                  <HiPaperAirplane /> {sending ? "Sending…" : "Send"}
                </PortalButton>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
