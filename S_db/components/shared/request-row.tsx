"use client"

import { cn } from "@/lib/utils"
import type { SourcingRequest } from "@/lib/types"

interface RequestRowProps {
  request: SourcingRequest
  onClick?: () => void
  className?: string
}

export function RequestRow({ request, onClick, className }: RequestRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "grid w-full grid-cols-[auto_1fr_auto] items-center gap-[13px] rounded-[11px] border-0 bg-transparent p-[13px] text-left text-ink transition-colors hover:bg-canvas",
        className
      )}
    >
      <span className="grid size-[46px] place-items-center rounded-[11px] border border-line bg-gradient-to-br from-[#e3eaf2] to-white font-heading text-[11px] font-extrabold text-[#78879b] dark:from-[#13293f] dark:to-[#0d2134]">
        {request.photo ? "PHOTO" : "PART"}
      </span>
      <span>
        <strong className="block text-[13px]">
          <i
            className={cn(
              "mr-1.5 inline-block size-2 rounded-full bg-[#8c9aac]",
              request.urgent && "bg-danger shadow-[0_0_0_4px_var(--red-bg)]"
            )}
          />
          {request.part}
        </strong>
        <span className="text-[11px] text-muted-text">
          {request.vehicle} · {request.location} · Qty {request.qty}
        </span>
      </span>
      <span className="text-right">
        <b className="block text-xs text-danger">{request.expires}</b>
        <span className="text-[10px] text-muted-text">response time left</span>
      </span>
    </button>
  )
}
