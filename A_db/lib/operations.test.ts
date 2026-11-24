import { describe, expect, it, vi } from "vitest";
import { ApiError, message } from "./api";
import { optionPricingPreview, requireAuditedReason } from "./operations";
import { safeInternalPath, idempotencyKey } from "./utils";
import { canUseAdminPortal } from "../providers/auth-provider";

describe("admin authentication boundary", () => {
  it.each(["ADMIN", "SUPER_ADMIN"] as const)("allows %s", (role) =>
    expect(canUseAdminPortal({ role })).toBe(true),
  );
  it.each(["CUSTOMER", "SUPPLIER_OWNER", "SUPPLIER_STAFF"] as const)(
    "rejects %s",
    (role) => expect(canUseAdminPortal({ role })).toBe(false),
  );
  it("rejects external post-login redirects", () =>
    expect(safeInternalPath("//attacker.example")).toBe("/dashboard"));
});

describe("consequential action helpers", () => {
  it("requires a meaningful audited reason", () => {
    expect(() => requireAuditedReason(" x ")).toThrow();
    expect(requireAuditedReason(" stock mismatch ")).toBe("stock mismatch");
  });
  it("keeps server-calculated prices verbatim instead of recalculating totals", () =>
    expect(
      optionPricingPreview({
        supplierSubtotal: "80.00",
        platformMargin: "10.00",
        customerItemsTotal: "90.00",
        deliveryCharge: "5.00",
        priorityCharge: "2.00",
        customerTotal: "97.00",
      }),
    ).toEqual({
      supplierSubtotal: "80.00",
      platformMargin: "10.00",
      customerItemsTotal: "90.00",
      deliveryCharge: "5.00",
      priorityCharge: "2.00",
      customerTotal: "97.00",
    }));
  it("creates unique keys while the API client preserves a body through its single retry", () => {
    vi.stubGlobal("crypto", {
      randomUUID: vi.fn().mockReturnValueOnce("one").mockReturnValueOnce("two"),
    });
    expect(idempotencyKey("payment")).toBe("payment-one");
    expect(idempotencyKey("payment")).toBe("payment-two");
    vi.unstubAllGlobals();
  });
  it("surfaces safe API failures with a supportable request id", () =>
    expect(
      message(
        new ApiError(
          "Version is stale",
          "VERSION_CONFLICT",
          409,
          [],
          "req-123",
        ),
      ),
    ).toBe("Version is stale · Request req-123"));
});
