import { apiRequest } from "@/lib/services/auth"
import type { Quotation, QuoteStatus } from "@/lib/types"

export type ApiQuote = {
  id: string; quotationNumber: string; requestId: string; assignmentId: string; status: string;
  revisionNumber: number; supplierSubtotal: string; preparationTimeMin: number | null;
  deliveryEstimateText: string | null; compatibilityNotes: string | null; supplierNotes: string | null;
  validUntil: string; submittedAt: string | null;
  items: Array<{ id: string; requestItemId: string; productId: string | null; inventoryId: string | null; lineNumber: number; alternativeToItemId: string | null; description: string; brand: string | null; partNumber: string | null; condition: string; quantity: number; supplierUnitPrice: string; compatibilityNotes: string | null; alternativePartInfo: string | null }>;
  clarifications: Array<{ id: string; question: string; reply: string | null; askedAt: string }>;
  revisions?: Array<{ id: string; quotationNumber: string; revisionNumber: number; status: string; submittedAt: string | null }>;
}
const headers = (businessId: string) => ({ "x-business-id": businessId })
const status = (value: string): QuoteStatus => value === "ACCEPTED" ? "Accepted" : value === "CLARIFICATION" ? "Clarification" : ["REJECTED", "WITHDRAWN", "SUPERSEDED", "EXPIRED"].includes(value) ? "Not selected" : "Awaiting decision"
const view = (quote: ApiQuote): Quotation => ({ backendId: quote.id, id: quote.quotationNumber, request: quote.requestId, part: quote.items.map((item) => item.description).join(", "), brand: quote.items.map((item) => item.brand).filter(Boolean).join(", ") || "Unbranded", price: `৳${quote.supplierSubtotal}`, eta: quote.deliveryEstimateText || "Pending", status: status(quote.status), condition: quote.items[0]?.condition, compatibility: quote.items.map((item) => item.compatibilityNotes).filter(Boolean).join("; "), submittedAt: quote.submittedAt ?? undefined, rawStatus: quote.status, revisionNumber: quote.revisionNumber, validUntil: quote.validUntil, supplierNotes: quote.supplierNotes, clarificationItems: quote.clarifications })

export async function getQuotations(businessId: string): Promise<Quotation[]> {
  const page = await apiRequest<{ items: ApiQuote[] }>("/supplier/quotations?pageSize=100", { headers: headers(businessId) })
  return page.items.map(view)
}
export function getQuotation(businessId: string, id: string) {
  return apiRequest<ApiQuote>(`/supplier/quotations/${id}`, { headers: headers(businessId) })
}
export function createRevision(businessId: string, id: string) {
  return apiRequest<ApiQuote>(`/supplier/quotations/${id}/revisions`, { method: "POST", headers: headers(businessId) })
}
export function withdrawQuotation(businessId: string, id: string, reason: string) {
  return apiRequest<ApiQuote>(`/supplier/quotations/${id}/withdraw`, { method: "POST", headers: headers(businessId), body: JSON.stringify({ reason }) })
}
export function replyClarification(businessId: string, quoteId: string, clarificationId: string, reply: string) {
  return apiRequest<unknown>(`/supplier/quotations/${quoteId}/clarifications/${clarificationId}/reply`, { method: "POST", headers: headers(businessId), body: JSON.stringify({ reply }) })
}
export function updateQuotation(businessId: string, quote: ApiQuote) {
  const primaryById = new Map(quote.items.map((item) => [item.id, item.lineNumber]))
  return apiRequest<ApiQuote>(`/supplier/quotations/${quote.id}`, { method: "PATCH", headers: headers(businessId), body: JSON.stringify({
    preparationTimeMin: quote.preparationTimeMin, deliveryEstimateText: quote.deliveryEstimateText,
    compatibilityNotes: quote.compatibilityNotes, supplierNotes: quote.supplierNotes, validUntil: quote.validUntil,
    items: quote.items.map((item) => ({ requestItemId: item.requestItemId, productId: item.productId, inventoryId: item.inventoryId, alternativeToLineNumber: item.alternativeToItemId ? primaryById.get(item.alternativeToItemId) : null, description: item.description, brand: item.brand, partNumber: item.partNumber, condition: item.condition, quantity: item.quantity, supplierUnitPrice: item.supplierUnitPrice, compatibilityNotes: item.compatibilityNotes, alternativePartInfo: item.alternativePartInfo }))
  }) })
}
export function submitQuotation(businessId: string, id: string) {
  return apiRequest<ApiQuote>(`/supplier/quotations/${id}/submit`, { method: "POST", headers: headers(businessId), body: JSON.stringify({ idempotencyKey: crypto.randomUUID() }) })
}
