import { cn } from "@/lib/utils"

interface PortalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "dark" | "danger"
  size?: "default" | "sm"
}

export function PortalButton({
  className,
  variant = "default",
  size = "default",
  type = "button",
  children,
  ...props
}: PortalButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[11px] border border-line bg-surface px-4 font-bold text-ink transition hover:-translate-y-px hover:shadow-[0_7px_16px_rgba(30,58,90,0.1)] disabled:pointer-events-none disabled:opacity-50",
        size === "default" && "min-h-[42px]",
        size === "sm" && "min-h-[34px] rounded-lg px-[11px] text-xs",
        variant === "primary" &&
          "border-blue bg-blue text-white shadow-[0_8px_20px_rgba(8,104,255,0.18)]",
        variant === "dark" && "border-navy bg-navy text-white",
        variant === "danger" && "text-danger",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
