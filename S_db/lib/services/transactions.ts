import { apiFileRequest, apiRequest } from "@/lib/services/auth"
import type { Transaction, TransactionSummary } from "@/lib/types"

type ApiEntry = {
  id: string
  reference: string
  type: string
  status: string
  amount: string
  orderId: string | null
  occurredAt: string | null
}

type Statement = {
  currency: "BDT"
  totalPayable: string
  paid: string
  outstanding: string
  items: Array<{
    id: string
    orderId: string
    orderNumber: string
    status: string
    originalAmount: string
    recoveryAmount: string
    paid: string
    outstanding: string
    eligibleAt: string
  }>
}

const format = (amount: string) =>
  `৳${Number(amount).toLocaleString("en-BD", { minimumFractionDigits: 2 })}`
const date = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-BD", { dateStyle: "medium" }).format(
        new Date(value),
      )
    : "Pending"

export async function getTransactionData(businessId: string): Promise<{
  transactions: Transaction[]
  summary: TransactionSummary
}> {
  const headers = { "x-business-id": businessId }
  const [page, statement] = await Promise.all([
    apiRequest<{ items: ApiEntry[] }>(
      "/supplier/finance/transactions?pageSize=100",
      { headers },
    ),
    apiRequest<Statement>("/supplier/finance/summary", { headers }),
  ])
  const transactions: Transaction[] = [
    ...statement.items
      .filter((item) => Number(item.outstanding) > 0)
      .map((item) => ({
        id: item.id,
        orderId: item.orderNumber,
        part: "Supplier payable",
        amount: format(item.originalAmount),
        fee: format(item.recoveryAmount),
        net: format(item.outstanding),
        status: "Pending settlement" as const,
        date: date(item.eligibleAt),
        invoiceId: "Statement",
      })),
    ...page.items.map((entry) => ({
      id: entry.reference,
      orderId: entry.orderId ?? "Multiple orders",
      part: entry.type.replaceAll("_", " ").toLowerCase(),
      amount: format(entry.amount),
      fee: "—",
      net: format(entry.amount),
      status:
        entry.type === "REVERSAL"
          ? ("Refunded" as const)
          : ("Completed" as const),
      date: date(entry.occurredAt),
      invoiceId: "Statement",
    })),
  ]
  return {
    transactions,
    summary: {
      completedPayments: format(statement.paid),
      pendingSettlements: format(statement.outstanding),
      monthTotal: format(statement.totalPayable),
    },
  }
}

export async function downloadStatement(businessId: string) {
  const response = await apiFileRequest(
    "/supplier/finance/statements/download",
    { headers: { "x-business-id": businessId } },
  )
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = "partsarc-supplier-statement.pdf"
  anchor.click()
  URL.revokeObjectURL(url)
}
