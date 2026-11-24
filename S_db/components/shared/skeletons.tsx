import { cn } from "@/lib/utils"

export function ShineSkeleton({ className }: { className?: string }) {
  return <div className={cn("shine-skeleton", className)} />
}

export function PageSkeleton() {
  return (
    <div>
      <ShineSkeleton className="mb-3 h-[35px] w-[270px]" />
      <ShineSkeleton className="mb-7 h-4 w-[430px] max-w-full" />
      <div className="mb-[18px] grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <ShineSkeleton key={i} className="h-[130px]" />
        ))}
      </div>
      <ShineSkeleton className="h-[380px]" />
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <ShineSkeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}

export function MetricGridSkeleton() {
  return (
    <div className="mb-[18px] grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <ShineSkeleton key={i} className="h-[130px]" />
      ))}
    </div>
  )
}

export function MessagesSkeleton() {
  return (
    <div className="grid min-h-[60vh] gap-0 overflow-hidden rounded-2xl border border-line bg-surface lg:grid-cols-[320px_1fr]">
      <div className="space-y-3 border-b border-line p-4 lg:border-b-0 lg:border-r">
        {Array.from({ length: 5 }).map((_, i) => (
          <ShineSkeleton key={i} className="h-16 w-full" />
        ))}
      </div>
      <div className="space-y-4 p-6">
        <ShineSkeleton className="h-8 w-1/2" />
        <ShineSkeleton className="h-24 w-3/4" />
        <ShineSkeleton className="h-24 w-2/3 self-end" />
        <ShineSkeleton className="mt-auto h-12 w-full" />
      </div>
    </div>
  )
}

export function DrawerSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <ShineSkeleton className="h-6 w-40" />
      <ShineSkeleton className="h-8 w-56" />
      <ShineSkeleton className="h-[190px] w-full" />
      <div className="grid grid-cols-2 gap-3">
        <ShineSkeleton className="h-16" />
        <ShineSkeleton className="h-16" />
        <ShineSkeleton className="h-16" />
        <ShineSkeleton className="h-16" />
      </div>
    </div>
  )
}
