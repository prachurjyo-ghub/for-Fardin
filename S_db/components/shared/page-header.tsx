import { cn } from "@/lib/utils"

interface PageHeaderProps {
  eyebrow: string
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col items-start justify-between gap-5 md:mb-[25px] md:flex-row md:items-end",
        className
      )}
    >
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="mb-1.5 font-heading text-[clamp(25px,3vw,36px)] font-extrabold tracking-[-1.1px] text-ink">
          {title}
        </h1>
        {description ? (
          <p className="m-0 text-sm text-muted-text">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full flex-wrap gap-2.5 md:w-auto">{actions}</div>
      ) : null}
    </div>
  )
}
