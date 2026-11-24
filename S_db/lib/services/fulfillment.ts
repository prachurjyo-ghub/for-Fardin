import { apiRequest } from "@/lib/services/auth"
import type { FulfillmentOrder, FulfillmentStatus } from "@/lib/types"

const headers = (businessId: string) => ({ "x-business-id": businessId })

export async function getFulfillmentOrders(
  businessId: string,
): Promise<FulfillmentOrder[]> {
  const page = await apiRequest<{ items: FulfillmentOrder[] }>(
    "/supplier/fulfillment?pageSize=100",
    { headers: headers(businessId) },
  )
  return page.items
}

export function getFulfillmentOrder(id: string, businessId: string) {
  return apiRequest<FulfillmentOrder>(`/supplier/fulfillment/${id}`, {
    headers: headers(businessId),
  })
}

export function confirmAvailability(
  id: string,
  businessId: string,
  available: boolean,
  note?: string,
) {
  return apiRequest<FulfillmentOrder>(
    `/supplier/fulfillment/${id}/availability`,
    {
      method: "POST",
      headers: headers(businessId),
      body: JSON.stringify({ available, note: note || null }),
    },
  )
}

export function updateOrderStatus(
  id: string,
  businessId: string,
  status: Extract<FulfillmentStatus, "SUPPLIER_PREPARING" | "READY_FOR_PICKUP">,
  note?: string,
) {
  return apiRequest<FulfillmentOrder>(
    `/supplier/fulfillment/${id}/transitions`,
    {
      method: "POST",
      headers: headers(businessId),
      body: JSON.stringify({ toStatus: status, note: note || null }),
    },
  )
}
