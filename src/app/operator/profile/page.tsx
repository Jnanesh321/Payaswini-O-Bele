"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import OperatorShell from "../_components/operator-shell"
import {
  User,
  ShieldCheck,
  Briefcase,
  TrendingUp,
  SlidersHorizontal,
  FileQuestion,
  LogOut,
  ChevronRight,
  Phone,
  Calendar,
} from "lucide-react"

interface CapabilityItem {
  id: string
  type: string
  status: string
  notes?: string | null
}

export default function OperatorProfilePage() {
  const { data: session } = useSession()
  const [capabilities, setCapabilities] = useState<CapabilityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    let ignore = false
    const load = async () => {
      try {
        const res = await fetch("/api/user/capabilities")
        const json = await res.json()
        if (!ignore && res.ok && json.detailedCapabilities) {
          setCapabilities(json.detailedCapabilities)
        }
      } catch {
        // Ignored
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => {
      ignore = true
    }
  }, [])

  const handleSignOut = async () => {
    setSigningOut(true)
    await signOut({ callbackUrl: "/login", redirect: true })
  }

  const opCap = capabilities.find((c) => c.type === "OPERATOR")
  const isVerified = opCap?.status === "VERIFIED"
  const isPending = opCap?.status === "PENDING"

  const userPhone =
    session?.user?.email ||
    ((session?.user as Record<string, unknown>)?.phone as string) ||
    "Verified Operator"

  return (
    <OperatorShell eyebrow="Account" title="Operator Profile">
      <div className="flex flex-col gap-4 pb-6">
        {/* Profile Card */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#D4A017]/20 font-display text-xl font-bold text-[#8B6508]">
              {session?.user?.name ? (
                session.user.name.charAt(0).toUpperCase()
              ) : (
                <User size={24} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="truncate font-display text-base font-bold text-foreground">
                  {session?.user?.name || "Field Operator"}
                </h2>
                {session?.user?.isAdmin && (
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                    ADMIN
                  </span>
                )}
              </div>
              <p className="flex items-center gap-1 text-xs text-muted-foreground font-mono mt-0.5">
                <Phone size={11} />
                <span>{userPhone}</span>
              </p>
              <div className="mt-1.5 flex items-center gap-1">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#D4A017]/15 px-2 py-0.5 text-[10px] font-bold text-[#8B6508]">
                  🔧 Certified Operator
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Verification Status */}
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 text-xs shadow-sm">
          <div className="flex items-start gap-2.5">
            <ShieldCheck
              size={18}
              className={isVerified ? "text-primary shrink-0 mt-0.5" : "text-amber-600 shrink-0 mt-0.5"}
            />
            <div>
              <p className="font-bold text-foreground">
                {isVerified
                  ? "Operator Certification Active"
                  : isPending
                  ? "Certification Pending Review"
                  : "Certification Under Verification"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {isVerified
                  ? "You are eligible to receive and accept nearby machinery jobs."
                  : "Platform admins are verifying your machinery license & experience."}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Console Navigation */}
        <div className="rounded-2xl border border-border bg-card p-3 shadow-sm divide-y divide-border/60 text-xs">
          <Link
            href="/operator/history"
            className="flex items-center justify-between py-2.5 px-2 text-foreground hover:bg-muted/50 rounded-xl transition"
          >
            <div className="flex items-center gap-2.5">
              <Briefcase size={16} className="text-[#8B6508]" />
              <span>Job Dispatch & Shift History</span>
            </div>
            <ChevronRight size={14} className="text-muted-foreground" />
          </Link>
          <Link
            href="/operator/earnings"
            className="flex items-center justify-between py-2.5 px-2 text-foreground hover:bg-muted/50 rounded-xl transition"
          >
            <div className="flex items-center gap-2.5">
              <TrendingUp size={16} className="text-primary" />
              <span>Payouts & Daily Earnings</span>
            </div>
            <ChevronRight size={14} className="text-muted-foreground" />
          </Link>
          <Link
            href="/onboarding"
            className="flex items-center justify-between py-2.5 px-2 text-foreground hover:bg-muted/50 rounded-xl transition"
          >
            <div className="flex items-center gap-2.5">
              <SlidersHorizontal size={16} className="text-[#C85A32]" />
              <span>Manage Role Profiles (Farmer / Owner)</span>
            </div>
            <ChevronRight size={14} className="text-muted-foreground" />
          </Link>
          <Link
            href="/how-it-works"
            className="flex items-center justify-between py-2.5 px-2 text-foreground hover:bg-muted/50 rounded-xl transition"
          >
            <div className="flex items-center gap-2.5">
              <FileQuestion size={16} className="text-muted-foreground" />
              <span>Operator SOP & Handover Guidelines</span>
            </div>
            <ChevronRight size={14} className="text-muted-foreground" />
          </Link>
        </div>

        {/* Sign Out Action */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <button
            type="button"
            disabled={signingOut}
            onClick={handleSignOut}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 py-3 text-xs font-bold text-destructive hover:bg-destructive hover:text-destructive-foreground transition disabled:opacity-50"
          >
            <LogOut size={16} />
            <span>{signingOut ? "Signing out…" : "Sign Out from Operator Console"}</span>
          </button>
        </div>
      </div>
    </OperatorShell>
  )
}
