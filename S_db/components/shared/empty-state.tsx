import { cn } from "@/lib/utils"
import { HiOutlineCube } from "react-icons/hi2"

interface EmptyStateProps {
  title: string
  description: string
  icon?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "grid min-h-[50vh] place-items-center px-6 py-16 text-center",
        className
      )}
    >
      <div className="max-w-[420px]">
        <div className="mx-auto mb-4 grid size-[62px] place-items-center rounded-[18px] bg-blue-2 text-[28px] text-blue">
          {icon ?? <HiOutlineCube />}
        </div>
        <h2 className="mb-2 font-heading text-2xl font-extrabold text-ink">{title}</h2>
        <p className="mb-5 leading-relaxed text-muted-text">{description}</p>
        {action}
      </div>
    </div>
  )
}
