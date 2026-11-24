import type { Json } from "./admin";

export function optionPricingPreview(option: Json) {
  return {
    supplierSubtotal: String(option.supplierSubtotal),
    platformMargin: String(option.platformMargin),
    customerItemsTotal: String(option.customerItemsTotal),
    deliveryCharge: String(option.deliveryCharge),
    priorityCharge: String(option.priorityCharge),
    customerTotal: String(option.customerTotal),
  };
}

export function requireAuditedReason(value: string) {
  const reason = value.trim();
  if (reason.length < 3)
    throw new Error("An audited reason of at least 3 characters is required");
  return reason;
}
