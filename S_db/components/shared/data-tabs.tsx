"use client"

import { cn } from "@/lib/utils"

export interface DataTab {
  id: string
  label: string
  count?: number
}

interface DataTabsProps {
  tabs: DataTab[]
  value: string
  onChange: (id: string) => void
  className?: string
}

export function DataTabs({ tabs, value, onChange, className }: DataTabsProps) {
  return (
    <div
      className={cn(
        "flex gap-1 overflow-x-auto border-b border-line px-4",
        className
      )}
    >
      {tabs.map((tab) => {
        const active = tab.id === value
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "whitespace-nowrap border-b-2 border-transparent px-3 py-[13px] text-xs font-bold text-muted-text transition-colors",
              active && "border-blue text-blue"
            )}
          >
            {tab.label}
            {typeof tab.count === "number" ? (
              <b className="ml-1 font-bold">({tab.count})</b>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
