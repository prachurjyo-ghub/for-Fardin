import { cn } from "@/lib/utils"
import { HiMagnifyingGlass } from "react-icons/hi2"

export function FormControl({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-[38px] rounded-[9px] border border-line bg-surface px-[11px] text-ink outline-none focus:border-blue focus:shadow-[0_0_0_3px_rgba(8,104,255,0.1)]",
        className
      )}
      {...props}
    />
  )
}

export function SearchControl({
  className,
  inputClassName,
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  inputClassName?: string
  label?: string
}) {
  return (
    <div
      data-slot="search-control"
      className={cn(
        "flex h-[38px] min-w-0 items-center gap-2.5 rounded-[9px] border border-line bg-surface px-[11px] text-ink focus-within:border-blue focus-within:shadow-[0_0_0_3px_rgba(8,104,255,0.1)]",
        className,
      )}
    >
      <HiMagnifyingGlass
        data-slot="search-icon"
        className="size-4 shrink-0 text-muted-text"
        aria-hidden="true"
      />
      <input
        {...props}
        type="search"
        aria-label={props["aria-label"] ?? label ?? props.placeholder}
        className={cn(
          "h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-ink outline-none",
          inputClassName,
        )}
      />
    </div>
  )
}

export function FormSelect({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-[38px] rounded-[9px] border border-line bg-surface px-[11px] text-ink outline-none focus:border-blue focus:shadow-[0_0_0_3px_rgba(8,104,255,0.1)]",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}

export function Field({
  label,
  children,
  hint,
  className,
  full,
}: {
  label: string
  children: React.ReactNode
  hint?: string
  className?: string
  full?: boolean
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", full && "sm:col-span-2", className)}>
      <label className="text-[11px] font-bold text-ink">{label}</label>
      {children}
      {hint ? <small className="text-[10px] text-muted-text">{hint}</small> : null}
    </div>
  )
}
