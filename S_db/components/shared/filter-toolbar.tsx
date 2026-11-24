import { cn } from "@/lib/utils"

interface FilterToolbarProps {
  children: React.ReactNode
  className?: string
}

export function FilterToolbar({ children, className }: FilterToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-2.5 border-b border-line px-[15px] py-[13px]",
        className
      )}
    >
      {children}
    </div>
  )
}
