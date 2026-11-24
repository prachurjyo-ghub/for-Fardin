import { apiRequest } from "@/lib/services/auth"
import type { FixedPurchaseRequest, FulfillmentOrder } from "@/lib/types"

const headers = (businessId: string) => ({ "x-business-id": businessId })

export function getPurchaseRequests(businessId: string) {
  return apiRequest<{ items: FixedPurchaseRequest[]; total: number }>(
    "/supplier/commerce/purchase-requests?pageSize=100",
    { headers: headers(businessId) },
  )
}

export function confirmPurchaseRequest(
  businessId: string,
  requestId: string,
  note?: string,
) {
  return apiRequest<FulfillmentOrder>(
    `/supplier/commerce/purchase-requests/${requestId}/confirm`,
    {
      method: "POST",
      headers: headers(businessId),
      body: JSON.stringify(note ? { note } : {}),
    },
  )
}
