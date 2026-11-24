import { getWallet } from "@/lib/services/credits"
import { getFulfillmentOrders } from "@/lib/services/fulfillment"
import { getInventory } from "@/lib/services/inventory"
import { getPurchaseRequests } from "@/lib/services/purchase-requests"
import { getQuotations } from "@/lib/services/quotations"
import { getRequestInboxSummary } from "@/lib/services/requests"

export async function getSupplierDashboard(businessId: string) {
  const [inventory, purchases, rfqs, quotations, orders, wallet] = await Promise.all([
    getInventory(businessId),
    getPurchaseRequests(businessId),
    getRequestInboxSummary(businessId),
    getQuotations(businessId),
    getFulfillmentOrders(businessId),
    getWallet(businessId),
  ])
  const activeOrders = orders.filter((order) => !["COMPLETED", "CANCELLED", "FAILED", "RETURNED"].includes(order.status))
  const actions = [
    ...purchases.items
      .filter((request) => !request.orders.some((order) => order.status === "CONFIRMED"))
      .map((request) => ({ id: `purchase-${request.id}`, title: request.creditStatus === "AWAITING_CREDITS" ? "Purchase request needs credits" : "Purchase request awaiting confirmation", detail: `${request.requestNumber} · ${request.items[0]?.description ?? "Requested part"}`, href: "/requests", tone: request.creditStatus === "AWAITING_CREDITS" ? "warning" : "default" })),
    ...rfqs.filter((request) => ["ASSIGNED", "VIEWED"].includes(request.status)).map((request) => ({ id: `rfq-${request.id}`, title: "RFQ awaiting quotation", detail: `${request.request.requestNumber} · ${request.request.title ?? "Sourcing request"}`, href: "/requests", tone: request.request.urgency === "URGENT" ? "warning" : "default" })),
    ...activeOrders.filter((order) => ["PENDING_SUPPLIER_CONFIRMATION", "CONFIRMED", "SUPPLIER_PREPARING"].includes(order.status)).map((order) => ({ id: `order-${order.id}`, title: order.status === "PENDING_SUPPLIER_CONFIRMATION" ? "Order awaiting confirmation" : order.status === "CONFIRMED" ? "Order ready to prepare" : "Order in preparation", detail: `${order.orderNumber} · ${order.items[0]?.description ?? "Order items"}`, href: "/orders", tone: "default" })),
    ...wallet.topUps.filter((topUp) => topUp.status === "PENDING").map((topUp) => ({ id: `topup-${topUp.id}`, title: "Top-up awaiting verification", detail: `${topUp.amount} credits · ${topUp.externalReference}`, href: "/credit-wallet", tone: "default" })),
  ].slice(0, 8)

  return {
    metrics: {
      activeListings: inventory.items.filter((item) => item.publicationStatus === "PUBLISHED" && item.isActive).length,
      pendingPurchaseRequests: purchases.items.filter((request) => !request.orders.some((order) => order.status === "CONFIRMED")).length,
      pendingRfqs: rfqs.filter((request) => ["ASSIGNED", "VIEWED"].includes(request.status)).length,
      activeOrders: activeOrders.length,
      completedSales: orders.filter((order) => order.status === "COMPLETED").length,
    },
    wallet,
    actions,
    recentActivity: wallet.entries.slice(0, 6),
    quotationCount: quotations.filter((quotation) => quotation.status === "Awaiting decision").length,
  }
}
