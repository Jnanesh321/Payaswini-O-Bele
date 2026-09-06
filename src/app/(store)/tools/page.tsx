import { Suspense } from "react"
import { getTranslations } from "next-intl/server"
import { Skeleton } from "@/components/ui"
import { ToolsContent } from "@/components/tools/tools-content"
import { FarmerShell } from "@/components/layout/farmer-shell"

export default async function ToolsPage() {
  const t = await getTranslations("tools")
  return (
    <FarmerShell
      eyebrow="Machinery Catalog"
      title={t("title")}
      subtitle={t("subtitle")}
    >
      <Suspense fallback={<ToolsLoading />}>
        <ToolsContent />
      </Suspense>
    </FarmerShell>
  )
}

function ToolsLoading() {
  return (
    <div className="grid grid-cols-1 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <Skeleton className="aspect-[4/3] w-full rounded-xl" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      ))}
    </div>
  )
}
