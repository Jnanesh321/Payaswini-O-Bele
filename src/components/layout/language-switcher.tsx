"use client"

import { useLocale } from "next-intl"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Globe } from "lucide-react"
import { Button } from "@/components/ui"
import { cn } from "@/lib/utils"

const locales = [
  { code: "kn", label: "ಕನ್ನಡ" },
  { code: "en", label: "English" },
]

export function LanguageSwitcher({ transparent = false }: { transparent?: boolean }) {
  const locale = useLocale()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const switchLocale = (next: string) => {
    if (next === locale) return

    startTransition(() => {
      const cookie = `NEXT_LOCALE=${next}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`
      document.cookie = cookie
      router.refresh()
    })
  }

  const other = locales.find((l) => l.code !== locale)

  return (
    <div className="flex items-center gap-0.5">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => switchLocale(other?.code || "en")}
        disabled={isPending}
        className={cn(
          "gap-1.5 px-2 text-xs font-semibold",
          transparent && "text-white/80 hover:text-white"
        )}
      >
        <Globe className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{other?.code.toUpperCase()}</span>
        <span className="sm:hidden">{other?.code.toUpperCase()}</span>
      </Button>
    </div>
  )
}
