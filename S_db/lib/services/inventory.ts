import { apiFileRequest, apiRequest } from "@/lib/services/auth"
import type { CatalogueProduct, CsvPreview, InventoryItem, ListingImage } from "@/lib/types"

const headers = (businessId: string) => ({ "x-business-id": businessId })

export const stockStatus = (item: InventoryItem) =>
  item.availabilityStatus === "LOW_STOCK" ? "Low stock" as const :
  item.availabilityStatus === "OUT_OF_STOCK" ? "Out of stock" as const :
  item.availabilityStatus === "HIDDEN" ? "Unavailable" as const : "In stock" as const

export async function getInventory(businessId: string, search = "") {
  const query = new URLSearchParams({ pageSize: "100" })
  if (search) query.set("search", search)
  return apiRequest<{ items: InventoryItem[]; total: number }>(`/supplier/inventory?${query}`, { headers: headers(businessId) })
}

export async function getCatalogue(businessId: string, search = "") {
  const query = new URLSearchParams({ pageSize: "100" })
  if (search) query.set("search", search)
  return apiRequest<{ items: CatalogueProduct[]; total: number }>(`/supplier/catalogue/products?${query}`, { headers: headers(businessId) })
}

export function createOffering(businessId: string, input: { productId: string; sku: string; unitPrice: string; condition: string; listingClassification?: string; publicationStatus?: string; stockQuantity: number; minimumStock: number; preparationTimeMin: number | null; isAvailable: boolean; notes: string | null }) {
  return apiRequest<InventoryItem>("/supplier/inventory", { method: "POST", headers: headers(businessId), body: JSON.stringify(input) })
}

export function updateOffering(businessId: string, id: string, input: { sku?: string; unitPrice?: string; condition?: string; listingClassification?: string; publicationStatus?: string; minimumStock?: number; preparationTimeMin?: number | null; isAvailable?: boolean; notes?: string | null }) {
  return apiRequest<InventoryItem>(`/supplier/inventory/${id}`, { method: "PATCH", headers: headers(businessId), body: JSON.stringify(input) })
}

async function imageResponse(response: Response) {
  const payload = await response.json() as { success: boolean; data?: ListingImage; error?: { message: string } }
  if (!payload.success || !payload.data) throw new Error(payload.error?.message ?? "Image upload failed")
  return payload.data
}

export async function uploadListingImage(businessId: string, inventoryId: string, blob: Blob) {
  return imageResponse(await apiFileRequest(`/supplier/inventory/${inventoryId}/images`, { method: "POST", headers: { ...headers(businessId), "content-type": "image/webp" }, body: blob }))
}

export async function replaceListingImage(businessId: string, inventoryId: string, imageId: string, blob: Blob) {
  return imageResponse(await apiFileRequest(`/supplier/inventory/${inventoryId}/images/${imageId}`, { method: "PUT", headers: { ...headers(businessId), "content-type": "image/webp" }, body: blob }))
}

export function reorderListingImages(businessId: string, inventoryId: string, imageIds: string[]) {
  return apiRequest<ListingImage[]>(`/supplier/inventory/${inventoryId}/images`, { method: "PATCH", headers: headers(businessId), body: JSON.stringify({ imageIds }) })
}

export async function deleteListingImage(businessId: string, inventoryId: string, imageId: string) {
  await apiFileRequest(`/supplier/inventory/${inventoryId}/images/${imageId}`, { method: "DELETE", headers: headers(businessId) })
}

export function adjustStock(businessId: string, id: string, quantityDelta: number, reason: string) {
  return apiRequest<{ inventory: InventoryItem; duplicate: boolean }>(`/supplier/inventory/${id}/stock-adjustments`, { method: "POST", headers: headers(businessId), body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), quantityDelta, reason }) })
}

export function bulkUpdate(businessId: string, items: InventoryItem[], minimumStock: number) {
  return apiRequest<{ items: InventoryItem[]; count: number }>("/supplier/inventory/bulk", { method: "POST", headers: headers(businessId), body: JSON.stringify({ operationId: crypto.randomUUID(), items: items.map((item) => ({ inventoryId: item.id, version: item.version, minimumStock })) }) })
}

export async function previewCsv(businessId: string, file: File) {
  const response = await apiFileRequest("/supplier/inventory/csv/preview", { method: "POST", headers: { ...headers(businessId), "content-type": "text/csv" }, body: file })
  const payload = await response.json() as { success: boolean; data?: CsvPreview; error?: { message: string } }
  if (!payload.success || !payload.data) throw new Error(payload.error?.message ?? "CSV preview failed")
  return payload.data
}

export function confirmCsv(businessId: string, previewId: string) {
  return apiRequest<{ created: number; updated: number; duplicate: boolean }>("/supplier/inventory/csv/confirm", { method: "POST", headers: headers(businessId), body: JSON.stringify({ previewId }) })
}

export async function downloadCsvTemplate(businessId: string) {
  const response = await apiFileRequest("/supplier/inventory/csv-template", { headers: headers(businessId) })
  const url = URL.createObjectURL(await response.blob())
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = "partsarc-inventory.csv"
  anchor.click()
  URL.revokeObjectURL(url)
}
