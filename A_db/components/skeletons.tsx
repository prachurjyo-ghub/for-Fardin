import { Skeleton } from "@/components/ui/skeleton";

export function DetailPageSkeleton() {
  return (
    <div className="space-y-7" role="status" aria-label="Loading page">
      <div className="space-y-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-10 w-full max-w-lg" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div className="panel space-y-3 p-5" key={index}>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
      <div className="panel space-y-4 p-5">
        <Skeleton className="h-6 w-48" />
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton className="h-14 w-full" key={index} />
        ))}
      </div>
      <span className="sr-only">Loading operational record</span>
    </div>
  );
}

export function SessionSkeleton() {
  return (
    <div
      className="min-h-screen lg:grid lg:grid-cols-[288px_1fr]"
      role="status"
      aria-label="Restoring session"
    >
      <div className="hidden bg-[#242628] lg:block" />
      <div className="space-y-7 p-5 md:p-8">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
      <span className="sr-only">Restoring secure session</span>
    </div>
  );
}
