import { redirect } from "next/navigation";

export default function LegacyQuotationReviewPage() {
  redirect("/requests?view=rfq");
}
