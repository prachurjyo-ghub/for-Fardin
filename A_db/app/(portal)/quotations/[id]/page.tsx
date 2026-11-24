"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ErrorBox, PageHeader } from "@/components/page";
import { Button, Status } from "@/components/ui";
import { DetailPageSkeleton } from "@/components/skeletons";
import { type Json } from "@/lib/admin";
import { useResource } from "@/lib/use-resource";
import { formatBdt, formatDhaka } from "@/lib/utils";

export default function QuotationDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const quote = useResource<Json>(`/admin/quotations/${id}`);
  if (quote.loading) return <DetailPageSkeleton />;
  if (quote.error || !quote.data)
    return <ErrorBox message={quote.error || "Quotation not found"} />;
  return (
    <>
      <PageHeader
        eyebrow="SUPPLIER QUOTATION"
        title={String(quote.data.quotationNumber)}
        description="This immutable revision opens in the linked request comparison workspace for clarification, rejection and customer option preparation."
        action={<Status value={String(quote.data.status)} />}
      />
      <div className="panel p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Fact label="Revision" value={String(quote.data.revisionNumber)} />
          <Fact
            label="Supplier subtotal"
            value={formatBdt(quote.data.supplierSubtotal)}
          />
          <Fact
            label="Valid until"
            value={formatDhaka(quote.data.validUntil)}
          />
        </div>
        <Button className="mt-5" asChild>
          <Link href={`/requests/${String(quote.data.requestId)}`}>
            Open request comparison <ArrowRight size={15} />
          </Link>
        </Button>
      </div>
    </>
  );
}
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted p-4">
      <p className="eyebrow">{label}</p>
      <b className="mt-2 block">{value}</b>
    </div>
  );
}
