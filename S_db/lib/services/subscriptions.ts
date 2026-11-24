import { apiRequest } from "@/lib/services/auth"
import type { CurrentSubscription } from "@/lib/types"

export function getCurrentSubscription(businessId: string) {
  return apiRequest<CurrentSubscription | null>("/supplier/subscriptions/current", {
    headers: { "x-business-id": businessId },
  })
}
