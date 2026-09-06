"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Compass, CalendarDays, User, ShoppingBag } from "lucide-react"
import { useCartStore } from "@/store/cart"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"
import { useMounted } from "@/hooks/use-mounted"

interface BottomNavProps {
  className?: string
}

export function BottomNav({ className }: BottomNavProps) {
  const pathname = usePathname()
  const t = useTranslations("homeUtility")
  const itemCount = useCartStore((s) => s.getItemCount())
  const mounted = useMounted()

  const navItems = [
    {
      id: "explore",
      href: "/",
      label: t("explore"),
      icon: Compass,
      isActive: pathname === "/",
    },
    {
      id: "bookings",
      href: "/dashboard",
      label: t("bookings"),
      icon: CalendarDays,
      isActive: pathname === "/dashboard",
    },
    {
      id: "cart",
      href: "/cart",
      label: "Cart",
      icon: ShoppingBag,
      isActive: pathname.startsWith("/cart") || pathname.startsWith("/checkout"),
      badge: mounted && itemCount > 0 ? (itemCount > 9 ? "9+" : itemCount) : null,
    },
    {
      id: "profile",
      href: "/dashboard#account",
      label: t("profile"),
      icon: User,
      isActive: pathname === "/dashboard#account" || pathname.startsWith("/onboarding"),
    },
  ]

  return (
    <nav
      aria-label="Mobile Navigation"
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 border-t border-border/80 bg-card/95 backdrop-blur-md pb-safe shadow-[0_-4px_16px_rgba(0,0,0,0.06)]",
        className
      )}
    >
      <div className="mx-auto flex h-16 max-w-[440px] items-center justify-around px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = item.isActive

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center py-1 text-center transition-colors touch-manipulation select-none",
                active
                  ? "text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground font-medium"
              )}
            >
              <div className="relative flex items-center justify-center">
                <div
                  className={cn(
                    "flex h-8 w-12 items-center justify-center rounded-full transition-all duration-200",
                    active && "bg-primary/10 text-primary"
                  )}
                >
                  <Icon
                    size={20}
                    strokeWidth={active ? 2.4 : 1.8}
                    className={active ? "text-primary" : "text-muted-foreground"}
                  />
                </div>

                {item.badge && (
                  <span className="absolute -right-1 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-accent-foreground shadow-sm">
                    {item.badge}
                  </span>
                )}
              </div>

              <span
                className={cn(
                  "mt-0.5 text-[10px] leading-tight tracking-tight",
                  active ? "text-primary font-bold" : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>

              {active && (
                <span className="absolute bottom-1 h-0.5 w-6 rounded-full bg-accent" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
