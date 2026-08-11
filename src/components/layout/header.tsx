"use client"

import { useState, useEffect, startTransition } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { motion, AnimatePresence } from "framer-motion"
import { ShoppingCart, Menu, X, User } from "lucide-react"
import { Button, Badge } from "@/components/ui"
import { useCartStore } from "@/store/cart"
import { LanguageSwitcher } from "./language-switcher"
import { cn } from "@/lib/utils"

export function Header() {
  const t = useTranslations("nav")
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()
  const itemCount = useCartStore((s) => s.getItemCount())
  const isLanding = pathname === "/"

  const navLinks = [
    { href: "/", label: t("home") },
    { href: "/tools", label: t("tools") },
    { href: "/how-it-works", label: t("howItWorks") },
  ]

  useEffect(() => {
    startTransition(() => {
      setMobileOpen(false)
    })
  }, [pathname])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const transparent = false

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        transparent
          ? "bg-transparent"
          : "bg-bele-cream/95 backdrop-blur-md shadow-sm"
      )}
    >
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="relative shrink-0">
          <Image
            src="/logos/obele-logo.svg"
            alt="O Bele"
            width={110}
            height={39}
            className="h-9 w-auto"
            priority
          />
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "relative text-sm font-medium transition-colors",
                transparent
                  ? "text-white/80 hover:text-white"
                  : "text-muted-foreground hover:text-foreground",
                pathname === link.href &&
                  (transparent ? "text-white" : "text-foreground")
              )}
            >
              {link.label}
              {pathname === link.href && (
                <motion.span
                  layoutId="nav-indicator"
                  className={cn(
                    "absolute -bottom-1 left-0 right-0 h-0.5 rounded-full",
                    transparent ? "bg-white" : "bg-primary"
                  )}
                />
              )}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <LanguageSwitcher transparent={transparent} />

          <Link href="/cart">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "relative",
                transparent && "text-white/80 hover:text-white"
              )}
              aria-label="Cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <Badge
                  variant="accent"
                  className="absolute -right-1.5 -top-1.5 flex h-4.5 w-4.5 min-w-0 items-center justify-center rounded-full p-0 text-[10px] font-bold leading-none"
                >
                  {itemCount > 99 ? "99+" : itemCount}
                </Badge>
              )}
            </Button>
          </Link>

          <Link href="/login">
            <Button
              variant={transparent ? "outline" : "default"}
              size="sm"
              className={cn(
                "hidden sm:inline-flex",
                transparent &&
                  "border-white/30 text-white hover:bg-white/10 hover:text-white"
              )}
            >
              <User className="mr-1 h-4 w-4" />
              {t("login")}
            </Button>
          </Link>

          <a
            href="https://payaswini.com"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "hidden lg:inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-medium transition-colors",
              transparent
                ? "border border-white/20 text-white/80 hover:bg-white/10 hover:text-white"
                : "border border-bele-gold/30 bg-bele-gold/10 text-bele-soil hover:bg-bele-gold/20"
            )}
          >
            <svg
              viewBox="0 0 240 80"
              className="h-3.5 w-auto"
              aria-hidden="true"
            >
              <g transform="translate(4, 5)">
                <circle cx="30" cy="30" r="28" fill="#1B4D5A" />
                <path
                  d="M 30 10 Q 45 20 42 35 Q 30 45 18 35 Q 15 20 30 10 Z"
                  fill="#D4A017"
                  opacity="0.95"
                />
                <path
                  d="M 30 10 Q 30 25 30 45"
                  stroke="#1B4D5A"
                  strokeWidth="1.2"
                  fill="none"
                />
              </g>
            </svg>
            Payaswini
          </a>

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "md:hidden",
              transparent && "text-white/80 hover:text-white"
            )}
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="drawer-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              key="drawer-panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-y-0 right-0 z-50 w-72 bg-bele-cream shadow-xl md:hidden"
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-4">
                <Image
                  src="/logos/obele-logo.svg"
                  alt="O Bele"
                  width={90}
                  height={32}
                  className="h-7 w-auto"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <nav className="space-y-1 px-3 py-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                      pathname === link.href
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <div className="border-t border-border px-4 py-4 space-y-3">
                <Link href="/login" onClick={() => setMobileOpen(false)}>
                  <Button variant="default" className="w-full">
                    <User className="mr-1 h-4 w-4" />
                    {t("login")} / {t("register")}
                  </Button>
                </Link>

                <Link href="/cart" onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" className="relative w-full">
                    <ShoppingCart className="mr-1 h-4 w-4" />
                    Cart
                    {itemCount > 0 && (
                      <Badge
                        variant="accent"
                        className="ml-2 h-5 min-w-5 rounded-full px-1.5 text-[10px] font-bold leading-none"
                      >
                        {itemCount > 99 ? "99+" : itemCount}
                      </Badge>
                    )}
                  </Button>
                </Link>

                <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-2">
                  <span className="text-xs text-muted-foreground">Language</span>
                  <LanguageSwitcher />
                </div>

                <a
                  href="https://payaswini.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-bele-gold/30 bg-bele-gold/10 px-3 py-2.5 text-xs font-medium text-bele-soil transition-colors hover:bg-bele-gold/20"
                >
                  <svg
                    viewBox="0 0 240 80"
                    className="h-4 w-auto"
                    aria-hidden="true"
                  >
                    <g transform="translate(4, 5)">
                      <circle cx="30" cy="30" r="28" fill="#1B4D5A" />
                      <path
                        d="M 30 10 Q 45 20 42 35 Q 30 45 18 35 Q 15 20 30 10 Z"
                        fill="#D4A017"
                        opacity="0.95"
                      />
                      <path
                        d="M 30 10 Q 30 25 30 45"
                        stroke="#1B4D5A"
                        strokeWidth="1.2"
                        fill="none"
                      />
                    </g>
                  </svg>
                  Product of Payaswini.com
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  )
}
