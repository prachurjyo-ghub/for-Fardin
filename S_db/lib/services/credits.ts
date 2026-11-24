import { apiRequest } from "@/lib/services/auth"
import type { SupplierWallet, WalletTopUp } from "@/lib/types"

const headers = (businessId: string) => ({ "x-business-id": businessId })

export function getWallet(businessId: string) {
  return apiRequest<SupplierWallet>("/supplier/credits/wallet", {
    headers: headers(businessId),
  })
}

export function submitTopUp(
  businessId: string,
  input: {
    amount: string
    paymentMethod: string
    externalReference: string
    evidenceReference?: string
    supplierNote?: string
  },
) {
  return apiRequest<WalletTopUp>("/supplier/credits/top-ups", {
    method: "POST",
    headers: headers(businessId),
    body: JSON.stringify({ ...input, idempotencyKey: crypto.randomUUID() }),
  })
}
