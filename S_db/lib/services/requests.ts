import { apiRequest } from "@/lib/services/auth"
import type { QuotePayload, RequestCategory, RequestStatus, SourcingRequest } from "@/lib/types"

type InboxRow = { id: string; status: string; responseDeadlineAt: string | null; request: { id: string; requestNumber: string; urgency: string; title: string | null; vehicle: { make?: string; model?: string; year?: number } | null; deliveryArea: { area?: string; city?: string } | null; items: Array<{ id: string; description: string; quantity: number; category?: { name: string } | null }>; attachmentCount: number } }
type AssignmentDetail = Omit<InboxRow, "request"> & { request: Omit<InboxRow["request"], "attachmentCount"> & { attachments: unknown[]; attachmentCount?: number } }
const headers = (businessId: string) => ({ "x-business-id": businessId })
const requestStatus = (value: string): RequestStatus => value === "VIEWED" ? "viewed" : value === "QUOTED" ? "quoted" : value === "SKIPPED" ? "skipped" : "new"
const mapRequest = (row: AssignmentDetail): SourcingRequest => ({
  id: row.id, requestId: row.request.id, requestItemId: row.request.items[0]?.id ?? "",
  part: row.request.items.map((item) => item.description).join(", ") || row.request.title || "Sourcing request",
  vehicle: row.request.vehicle ? [row.request.vehicle.make, row.request.vehicle.model, row.request.vehicle.year].filter(Boolean).join(" ") : "Vehicle details pending",
  location: row.request.deliveryArea ? [row.request.deliveryArea.area, row.request.deliveryArea.city].filter(Boolean).join(", ") : "Area pending",
  qty: row.request.items.reduce((sum, item) => sum + item.quantity, 0), urgent: row.request.urgency === "URGENT",
  expires: row.responseDeadlineAt ? new Date(row.responseDeadlineAt).toLocaleString() : "No deadline",
  photo: (row.request.attachmentCount ?? row.request.attachments?.length ?? 0) > 0, note: "Customer contact and exact address are private.",
  status: requestStatus(row.status), category: row.request.items[0]?.category?.name as RequestCategory | undefined,
})

export async function getRequests(businessId: string): Promise<SourcingRequest[]> {
  const page = await apiRequest<{ items: InboxRow[] }>("/supplier/requests?pageSize=100", { headers: headers(businessId) })
  return page.items.map((row) => mapRequest(row as AssignmentDetail))
}
export async function getRequestInboxSummary(businessId: string) {
  const page = await apiRequest<{ items: InboxRow[] }>("/supplier/requests?pageSize=100", { headers: headers(businessId) })
  return page.items
}
export async function getRequestById(id: string, businessId: string) { return mapRequest(await apiRequest<AssignmentDetail>(`/supplier/requests/${id}`, { headers: headers(businessId) })) }
export async function markRequestViewed(id: string, businessId: string) { await apiRequest(`/supplier/requests/${id}/view`, { method: "POST", headers: headers(businessId) }) }
export async function skipRequest(id: string, businessId: string) { await apiRequest(`/supplier/requests/${id}/skip`, { method: "POST", headers: headers(businessId), body: JSON.stringify({ reason: "Supplier cannot fulfil this request" }) }); return { ok: true as const, data: { id } } }
const prepMinutes: Record<string, number> = { "15–30 minutes": 30, "30–60 minutes": 60, "1–2 hours": 120, "Same day": 480 }
export async function submitQuote(payload: QuotePayload, businessId: string) {
  const draft = await apiRequest<{ id: string }>("/supplier/quotations", { method: "POST", headers: headers(businessId), body: JSON.stringify({
    assignmentId: payload.requestId, preparationTimeMin: prepMinutes[payload.preparationTime] ?? 60,
    deliveryEstimateText: payload.preparationTime, compatibilityNotes: payload.compatibility || null,
    supplierNotes: payload.supplierNotes || null,
    validUntil: new Date(`${payload.validUntil}T23:59:59Z`).toISOString(), items: [{ requestItemId: payload.requestItemId,
      description: payload.part, brand: payload.brand, condition: payload.condition.toUpperCase(), quantity: payload.quantity,
      supplierUnitPrice: payload.unitPrice, compatibilityNotes: payload.compatibility || null }],
  }) })
  await apiRequest(`/supplier/quotations/${draft.id}/submit`, { method: "POST", headers: headers(businessId), body: JSON.stringify({ idempotencyKey: crypto.randomUUID() }) })
  return { ok: true as const, data: { requestId: payload.requestId } }
}
export function filterRequests(list: SourcingRequest[], filters: { tab?: RequestStatus; search?: string; urgency?: "all" | "urgent" | "standard"; category?: RequestCategory | "all" }) { return list.filter((r) => (!filters.tab || r.status === filters.tab) && (filters.urgency === "urgent" ? r.urgent : filters.urgency === "standard" ? !r.urgent : true) && (!filters.category || filters.category === "all" || r.category === filters.category) && (!filters.search?.trim() || `${r.id} ${r.part} ${r.vehicle}`.toLowerCase().includes(filters.search.toLowerCase()))) }
export function countRequestsByStatus(list: SourcingRequest[]) { return { new: list.filter((r) => r.status === "new").length, viewed: list.filter((r) => r.status === "viewed").length, quoted: list.filter((r) => r.status === "quoted").length, skipped: list.filter((r) => r.status === "skipped").length } }
