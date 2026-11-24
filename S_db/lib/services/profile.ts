import type { BusinessProfile } from "@/lib/types";
import { apiRequest } from "@/lib/services/auth";

export function getBusinessProfile(businessId: string) {
  return apiRequest<BusinessProfile>("/supplier/profile", {
    headers: { "x-business-id": businessId },
  });
}
