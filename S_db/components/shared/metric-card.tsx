import { cn } from "@/lib/utils"

interface MetricCardProps {
  label: string
  value: string | number
  meta?: string
  bad?: boolean
  icon?: React.ReactNode
  className?: string
}

export function MetricCard({
  label,
  value,
  meta,
  bad = false,
  icon,
  className,
}: MetricCardProps) {
  return (
    <article
      className={cn(
        "rounded-2xl border border-line bg-surface px-[18px] py-[17px] shadow-[0_6px_20px_rgba(20,41,68,0.03)]",
        className
      )}
    >
      <div className="flex items-center justify-between text-xs font-semibold text-muted-text">
        <span>{label}</span>
        {icon ? (
          <span className="grid size-[30px] place-items-center rounded-[9px] bg-blue-2 text-blue">
            {icon}
          </span>
        ) : null}
      </div>
      <div className="my-3 font-heading text-[27px] font-extrabold tracking-[-0.8px] text-ink max-[680px]:text-[22px]">
        {value}
      </div>
      {meta ? (
        <div className="text-[11px] text-muted-text">
          <b className={cn("mr-1", bad ? "text-danger" : "text-success")}>{meta}</b>
        </div>
      ) : null}
    </article>
  )
}
