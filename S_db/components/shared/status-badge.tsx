import { cn } from "@/lib/utils"
import { statusTone } from "@/lib/status"
import type { BadgeTone } from "@/lib/types"

const toneStyles: Record<BadgeTone, string> = {
  blue: "bg-blue-2 text-[#0662d8] dark:text-[#9ec5ff]",
  green: "bg-success-bg text-success",
  amber: "bg-warning-bg text-warning",
  red: "bg-danger-bg text-danger",
  grey: "bg-[#eef2f6] text-[#65748a] dark:bg-[#1a2f42] dark:text-[#91a1b4]",
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const tone = statusTone(status)
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded-[7px] px-2 text-[10px] font-bold",
        toneStyles[tone],
        className
      )}
    >
      {status}
    </span>
  )
}
