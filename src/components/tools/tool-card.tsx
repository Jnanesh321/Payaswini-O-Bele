"use client"

import Link from "next/link"
import { useLocale } from "next-intl"
import { Card, Badge, Button } from "@/components/ui"
import { formatPrice, getLocaleName } from "@/lib/utils"
import type { ToolCard as ToolCardType } from "@/types"

const gradients = [
  "from-bele-green/30 to-bele-soil/20",
  "from-bele-gold/30 to-bele-green/20",
  "from-payaswini-blue/30 to-bele-gold/20",
  "from-bele-soil/30 to-payaswini-blue/20",
  "from-bele-green/30 to-bele-gold/20",
  "from-payaswini-blue/30 to-bele-soil/20",
]

interface ToolCardProps {
  tool: ToolCardType
  index?: number
}

export function ToolCard({ tool, index = 0 }: ToolCardProps) {
  const locale = useLocale()
  const displayName = getLocaleName(tool, locale)
  const fp = (n: number) => formatPrice(n, locale)

  return (
    <Link href={`/tools/${tool.id}`} className="group block">
      <Card className="overflow-hidden rounded-2xl transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg">
        <div
          className={`relative flex aspect-[4/3] items-center justify-center bg-gradient-to-br ${gradients[index % gradients.length]}`}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/60 backdrop-blur-sm">
            <span className="text-2xl font-bold text-bele-green">
              {displayName.charAt(0)}
            </span>
          </div>
          <Badge
            variant={tool.isActive ? "success" : "destructive"}
            className="absolute left-3 top-3"
          >
            {tool.isActive ? "Available" : "Rented"}
          </Badge>
          {tool.category && (
            <Badge
              variant="outline"
              className="absolute right-3 top-3 bg-white/80 backdrop-blur-sm"
            >
              {tool.category}
            </Badge>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-heading font-semibold text-foreground">
            {displayName}
          </h3>
          <p className="text-xs text-muted-foreground">{tool.name}</p>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <span className="font-heading text-xl font-bold text-bele-gold">
                {fp(tool.pricePerDay)}
              </span>
              <span className="text-xs text-muted-foreground">/day</span>
            </div>
            <span className="text-xs text-muted-foreground">
              Dep: {fp(tool.deposit)}
            </span>
          </div>
          <Button className="mt-3 w-full bg-bele-green text-white hover:bg-bele-green/90">
            Rent Now
          </Button>
        </div>
      </Card>
    </Link>
  )
}
