import { cn } from "@/lib/utils"

interface PanelProps {
  children: React.ReactNode
  className?: string
}

export function Panel({ children, className }: PanelProps) {
  return <section className={cn("portal-panel", className)}>{children}</section>
}

interface PanelHeadProps {
  title: string
  action?: React.ReactNode
  meta?: string
}

export function PanelHead({ title, action, meta }: PanelHeadProps) {
  return (
    <div className="flex items-center justify-between border-b border-line px-[19px] py-[17px]">
      <h2 className="m-0 font-heading text-[15px] font-bold text-ink">{title}</h2>
      {action ??
        (meta ? (
          <small className="text-[11px] font-bold text-blue">{meta}</small>
        ) : null)}
    </div>
  )
}
