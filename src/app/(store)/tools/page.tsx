import { Suspense } from "react"
import { getTranslations } from "next-intl/server"
import { Skeleton } from "@/components/ui"
import { ToolsContent } from "@/components/tools/tools-content"

export default async function ToolsPage() {
  const t = await getTranslations("tools")
  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          {t("title")}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>
      <Suspense fallback={<ToolsLoading />}>
        <ToolsContent />
      </Suspense>
    </div>
  )
}

function ToolsLoading() {
  return (
    <div className="flex gap-6">
      <div className="hidden w-64 shrink-0 space-y-4 lg:block">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="flex-1">
        <Skeleton className="mb-6 h-10 w-full" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-[4/3] rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
