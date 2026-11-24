import type { BadgeTone } from "@/lib/types"

export function statusTone(status: string): BadgeTone {
  if (/Delivered|Accepted|In Stock|Ready|Completed|Picked/i.test(status)) return "green"
  if (/Preparing|Awaiting|Clarification|Low|Pending/i.test(status)) return "amber"
  if (/Cancelled|Not selected|Out|Failed|Refunded/i.test(status)) return "red"
  return "blue"
}
