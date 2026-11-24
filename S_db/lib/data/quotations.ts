import type { Quotation } from "@/lib/types"

export const quotations: Quotation[] = [
  {
    id: "QT-8821",
    request: "RFQ-24011",
    part: "Front brake disc",
    brand: "Advics",
    price: "৳4,200",
    eta: "2–4 hours",
    status: "Awaiting decision",
  },
  {
    id: "QT-8820",
    request: "RFQ-24009",
    part: "Engine oil filter",
    brand: "Denso",
    price: "৳850",
    eta: "Same day",
    status: "Accepted",
  },
  {
    id: "QT-8819",
    request: "RFQ-24007",
    part: "AC compressor",
    brand: "Denso",
    price: "৳12,500",
    eta: "Next day",
    status: "Not selected",
  },
  {
    id: "QT-8818",
    request: "RFQ-24005",
    part: "Engine mounting",
    brand: "Genuine Toyota",
    price: "৳2,150",
    eta: "3–5 hours",
    status: "Clarification",
  },
]
