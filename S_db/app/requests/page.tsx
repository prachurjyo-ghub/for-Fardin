import { Suspense } from "react"
import RequestsWorkspace from "@/components/features/requests-workspace"
import { PageSkeleton } from "@/components/shared/skeletons"

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RequestsWorkspace />
    </Suspense>
  )
}
