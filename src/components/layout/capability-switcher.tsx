"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronDown,
  Check,
  Sparkles,
  ShoppingBag,
  SlidersHorizontal,
  LogOut,
  User,
  ShieldCheck,
  ExternalLink,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type CapabilityType = "FARMER" | "TOOL_OWNER" | "OPERATOR"

interface RoleMeta {
  id: CapabilityType
  title: string
  shortLabel: string
  description: string
  href: string
  icon: string
  badgeColor: string
}

const ROLES: RoleMeta[] = [
  {
    id: "FARMER",
    title: "Farmer / Rent Tools",
    shortLabel: "Farmer",
    description: "Browse & rent tools with doorstep delivery",
    href: "/tools",
    icon: "🌾",
    badgeColor: "bg-[#2D5016]/10 text-[#2D5016] border-[#2D5016]/20",
  },
  {
    id: "TOOL_OWNER",
    title: "Tool Owner Portal",
    shortLabel: "Tool Owner",
    description: "Manage fleet, rental requests & earnings",
    href: "/owner",
    icon: "🚜",
    badgeColor: "bg-[#C85A32]/10 text-[#C85A32] border-[#C85A32]/20",
  },
  {
    id: "OPERATOR",
    title: "Operator Console",
    shortLabel: "Operator",
    description: "Accept machine bookings & track shifts",
    href: "/operator",
    icon: "🔧",
    badgeColor: "bg-[#D4A017]/15 text-[#8B6508] border-[#D4A017]/30",
  },
]

interface CapabilitySwitcherProps {
  variant?: "header" | "drawer" | "shell"
  currentRole?: CapabilityType
  className?: string
}

export function CapabilitySwitcher({
  variant = "header",
  currentRole,
  className,
}: CapabilitySwitcherProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Determine active portal from current path or explicit prop
  const activeRole: CapabilityType =
    currentRole ||
    (pathname?.startsWith("/owner")
      ? "TOOL_OWNER"
      : pathname?.startsWith("/operator")
      ? "OPERATOR"
      : "FARMER")

  const currentRoleMeta = ROLES.find((r) => r.id === activeRole) || ROLES[0]

  // User's activated capabilities from session
  const isAdmin = Boolean(session?.user?.isAdmin)
  const rawCaps = Array.isArray(session?.user?.capabilities) ? (session.user.capabilities as string[]) : []
  const userCapabilities = isAdmin
    ? ["FARMER", "TOOL_OWNER", "OPERATOR"]
    : rawCaps.length > 0
    ? rawCaps
    : ["FARMER"]

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  // Close dropdown when route changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOpen(false)
  }, [pathname])

  if (status === "loading") {
    return (
      <div className="h-9 w-28 animate-pulse rounded-full bg-muted/60" />
    )
  }

  if (status === "unauthenticated" || !session?.user) {
    return null
  }

  const handleRoleSelect = (role: RoleMeta) => {
    setIsOpen(false)
    router.push(role.href)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VARIANT: DRAWER (Full mobile menu card layout)
  // ─────────────────────────────────────────────────────────────────────────────
  if (variant === "drawer") {
    return (
      <div className={cn("space-y-4", className)}>
        {/* User Card */}
        <div className="rounded-2xl border border-[#D5D9C9] bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2D5016]/10 text-base font-bold text-[#2D5016]">
              {session.user.name ? session.user.name.charAt(0).toUpperCase() : <User className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-bold text-[#143626]">
                  {session.user.name || "O~Bele Member"}
                </p>
                {session.user.isAdmin && (
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                    ADMIN
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Active: <span className="font-semibold text-foreground">{currentRoleMeta.shortLabel}</span>
              </p>
            </div>
          </div>

          {/* Role selector buttons */}
          <div className="mt-4 space-y-2 border-t border-border/50 pt-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Switch Workspace
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {ROLES.map((role) => {
                const isActive = activeRole === role.id
                const hasRole = userCapabilities.includes(role.id)
                return (
                  <button
                    key={role.id}
                    onClick={() => handleRoleSelect(role)}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-xl p-2 text-center transition-all",
                      isActive
                        ? "bg-[#2D5016] text-white shadow-sm"
                        : hasRole
                        ? "bg-[#FAF7F0] text-foreground hover:bg-[#F2ECE1] border border-[#D5D9C9]"
                        : "bg-muted/40 text-muted-foreground hover:bg-muted border border-dashed border-border"
                    )}
                  >
                    <span className="text-lg leading-none">{role.icon}</span>
                    <span className="mt-1 text-[11px] font-bold leading-tight">
                      {role.shortLabel}
                    </span>
                    {!hasRole && (
                      <span className="mt-0.5 text-[8px] font-semibold text-[#C85A32]">
                        + Activate
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Quick Account Links */}
          <div className="mt-4 flex flex-col gap-1 border-t border-border/50 pt-3 text-xs">
            <Link
              href="/dashboard"
              className="flex items-center justify-between rounded-lg px-2.5 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <span className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-[#2D5016]" />
                My Rental Bookings
              </span>
              <ChevronDown className="h-3.5 w-3.5 -rotate-90 text-muted-foreground" />
            </Link>

            <Link
              href="/onboarding"
              className="flex items-center justify-between rounded-lg px-2.5 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-[#C85A32]" />
                Manage Capabilities
              </span>
              <Sparkles className="h-3 w-3 text-[#D4A017]" />
            </Link>

            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex items-center justify-between rounded-lg px-2.5 py-2 text-destructive hover:bg-destructive/10"
            >
              <span className="flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                Sign Out
              </span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VARIANT: SHELL (Compact pill in Owner/Operator App header)
  // ─────────────────────────────────────────────────────────────────────────────
  if (variant === "shell") {
    return (
      <div className={cn("relative inline-block text-left", className)} ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#D5D9C9] bg-white px-2.5 py-1 text-xs font-bold text-[#143626] shadow-sm transition hover:bg-[#FAF7F0] focus:outline-none"
        >
          <span>{currentRoleMeta.icon}</span>
          <span className="max-w-[70px] truncate sm:max-w-none">{currentRoleMeta.shortLabel}</span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full z-50 mt-1.5 w-64 rounded-2xl border border-[#D5D9C9] bg-white p-2 shadow-xl ring-1 ring-black/5"
            >
              {/* User summary in shell dropdown */}
              <div className="border-b border-border/50 px-3 py-2">
                <div className="flex items-center justify-between gap-1.5">
                  <p className="truncate text-xs font-bold text-[#143626]">
                    {session.user.name || "O~Bele Member"}
                  </p>
                  {session.user.isAdmin && (
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[8px] font-bold text-primary">
                      ADMIN
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Active role: <span className="font-semibold text-foreground">{currentRoleMeta.shortLabel}</span>
                </p>
              </div>

              <div className="py-1 space-y-1">
                {ROLES.map((role) => {
                  const isActive = activeRole === role.id
                  const hasRole = userCapabilities.includes(role.id)
                  return (
                    <button
                      key={role.id}
                      onClick={() => handleRoleSelect(role)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition",
                        isActive
                          ? "bg-[#2D5016]/10 font-bold text-[#2D5016]"
                          : "text-foreground hover:bg-[#FAF7F0]"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{role.icon}</span>
                        <div>
                          <p className="font-semibold leading-tight">{role.title}</p>
                          <p className="text-[10px] text-muted-foreground leading-tight">
                            {hasRole ? "Switch role" : "Activate role"}
                          </p>
                        </div>
                      </div>
                      {isActive ? (
                        <Check className="h-4 w-4 text-[#2D5016]" />
                      ) : !hasRole ? (
                        <span className="rounded bg-[#C85A32]/10 px-1.5 py-0.5 text-[9px] font-bold text-[#C85A32]">
                          + Activate
                        </span>
                      ) : (
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-60" />
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="mt-1 border-t border-border/50 pt-1 space-y-0.5">
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 transition"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Admin Staff Console
                  </Link>
                )}
                <Link
                  href="/"
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  Main Marketplace
                </Link>
                <Link
                  href="/dashboard#account"
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <User className="h-3.5 w-3.5" />
                  My Profile & Account
                </Link>
                <Link
                  href="/onboarding"
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Manage Capabilities
                </Link>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 transition"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VARIANT: HEADER (Desktop pill & popover dropdown)
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className={cn("relative inline-block text-left", className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full border border-[#D5D9C9] bg-white/90 px-3 py-1.5 text-xs font-semibold text-[#143626] shadow-sm transition hover:border-[#2D5016] hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#2D5016]/20"
      >
        <span className="text-sm leading-none">{currentRoleMeta.icon}</span>
        <span className="hidden md:inline font-bold">{currentRoleMeta.shortLabel}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-2 w-72 origin-top-right rounded-2xl border border-[#D5D9C9] bg-white p-3 shadow-xl ring-1 ring-black/5"
          >
            {/* Header / User Info */}
            <div className="flex items-center gap-3 border-b border-border/50 pb-3 px-1">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2D5016]/10 text-sm font-bold text-[#2D5016]">
                {session.user.name ? session.user.name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-xs font-bold text-[#143626]">
                    {session.user.name || "O~Bele User"}
                  </p>
                  {session.user.isAdmin && (
                    <span className="rounded bg-primary/10 px-1 py-0.2 text-[8px] font-bold text-primary">
                      ADMIN
                    </span>
                  )}
                </div>
                <p className="truncate text-[11px] text-muted-foreground">
                  {session.user.email || "Verified Member"}
                </p>
              </div>
            </div>

            {/* Role List */}
            <div className="py-2 space-y-1">
              <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Your Capabilities
              </p>
              {ROLES.map((role) => {
                const isActive = activeRole === role.id
                const hasRole = userCapabilities.includes(role.id)
                return (
                  <button
                    key={role.id}
                    onClick={() => handleRoleSelect(role)}
                    className={cn(
                      "flex w-full items-start justify-between rounded-xl p-2.5 text-left transition",
                      isActive
                        ? "bg-[#2D5016]/10 border border-[#2D5016]/20"
                        : "hover:bg-[#FAF7F0] border border-transparent"
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="text-lg leading-none mt-0.5">{role.icon}</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-[#143626] leading-tight">
                            {role.title}
                          </p>
                          {isActive && (
                            <span className="rounded-full bg-[#2D5016] px-1.5 py-0.2 text-[8px] font-bold text-white leading-tight">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                          {role.description}
                        </p>
                      </div>
                    </div>

                    {!hasRole && (
                      <span className="shrink-0 mt-0.5 rounded-full bg-[#C85A32]/10 border border-[#C85A32]/20 px-1.5 py-0.5 text-[9px] font-bold text-[#C85A32]">
                        + Activate
                      </span>
                    )}
                    {hasRole && isActive && (
                      <Check className="h-4 w-4 shrink-0 text-[#2D5016] mt-0.5" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Footer Quick Links */}
            <div className="border-t border-border/50 pt-2 space-y-1">
              {isAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 transition"
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Admin Staff Console
                  </span>
                  <ChevronDown className="h-3 w-3 -rotate-90" />
                </Link>
              )}

              <Link
                href="/dashboard"
                className="flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-[#FAF7F0] hover:text-foreground transition"
              >
                <span className="flex items-center gap-2">
                  <ShoppingBag className="h-3.5 w-3.5 text-[#2D5016]" />
                  My Orders & Rentals
                </span>
                <ChevronDown className="h-3 w-3 -rotate-90" />
              </Link>

              <Link
                href="/onboarding"
                className="flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-[#FAF7F0] hover:text-foreground transition"
              >
                <span className="flex items-center gap-2">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-[#C85A32]" />
                  Manage Role Profiles
                </span>
                <Sparkles className="h-3 w-3 text-[#D4A017]" />
              </Link>

              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10 transition"
              >
                <span className="flex items-center gap-2">
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
