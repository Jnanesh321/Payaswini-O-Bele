"use client"

import { useCallback, useEffect, useState } from "react"
import { signOut } from "next-auth/react"
import OwnerShell from "../_components/owner-shell"
import { useLocale } from "next-intl"
import { formatPrice, formatDate } from "@/lib/utils"
import { Loader2, Settings, Check, Phone, MapPin, CalendarDays } from "lucide-react"

interface ProfileData {
  id: string
  name: string | null
  phone: string
  email: string | null
  image: string | null
  district: string | null
  taluk: string | null
  village: string | null
  pincode: string | null
  phoneVerified: boolean
  aadhaarVerified: boolean
  createdAt: string
  toolsCount: number
  rentalsCount: number
  lifetimeEarnings: number
  location: string
}

export default function OwnerProfilePage() {
  const locale = useLocale()
  const fp = (n: number) => formatPrice(n, locale)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [signingOut, setSigningOut] = useState(false)

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/owner/profile")
      const json = await res.json()
      if (res.ok) {
        setProfile(json.data)
      } else {
        setError(json.error || "Failed to load profile")
      }
    } catch {
      setError("Failed to load profile")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const handleSignOut = useCallback(async () => {
    setSigningOut(true)
    await signOut({ callbackUrl: "/login", redirect: true })
  }, [])

  const infoItems = profile
    ? [
        { label: "Phone", value: `+91 ${profile.phone}` },
        ...(profile.email ? [{ label: "Email", value: profile.email }] : []),
        { label: "Location", value: profile.location || "—" },
        { label: "Member since", value: formatDate(profile.createdAt) },
      ]
    : []

  const stats = profile
    ? [
        { label: "Tools", value: String(profile.toolsCount) },
        { label: "Rentals", value: String(profile.rentalsCount) },
        { label: "Earnings", value: fp(profile.lifetimeEarnings) },
      ]
    : []

  return (
    <OwnerShell
      title="Profile"
      subtitle={profile?.location ? `Tool Owner · ${profile.location}` : "Tool Owner"}
      headerRight={
        <button
          type="button"
          aria-label="Settings"
          className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10"
        >
          <Settings size={16} className="text-primary" />
        </button>
      }
    >
      {loading ? (
        <div className="flex flex-1 items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <p className="mb-3 rounded-2xl bg-destructive/10 px-4 py-3 text-center text-sm font-semibold text-destructive">
          {error}
        </p>
      ) : profile ? (
        <>
          {/* ── Green hero strip ─────────────────────────────── */}
          <div className="mt-2 rounded-b-[28px] rounded-t-[20px] bg-primary px-5 pb-10 pt-4 text-white">
            <div className="flex items-center gap-3.5">
              <div className="relative shrink-0">
                {profile.image ? (
                  <img
                    src={profile.image}
                    alt={profile.name ?? "Tool Owner"}
                    className="h-16 w-16 rounded-[20px] border-[3px] border-accent object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-[20px] border-[3px] border-accent bg-white/10 text-2xl font-bold">
                    {(profile.name?.trim()?.[0] ?? "O").toUpperCase()}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-primary bg-accent">
                  <Check size={10} className="text-white" strokeWidth={3} />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-xl font-bold text-white">
                  {profile.name ?? "Tool Owner"}
                </div>
                <div className="mt-0.5 text-xs text-white/65">
                  {profile.location ? `Tool Owner · ${profile.location}` : "Tool Owner"}
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  {profile.phoneVerified && (
                    <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent">
                      Verified
                    </span>
                  )}
                  <span className="text-[11px] text-white/50">{profile.toolsCount} tools listed</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Info card lifted over hero ───────────────────── */}
          <div className="mt-[-16px]">
            <div className="overflow-hidden rounded-[20px] border border-border bg-card shadow-[0_2px_12px_rgba(45,80,22,0.08)]">
              {infoItems.map((item, i) => (
                <div key={item.label}>
                  {i > 0 && <div className="ml-4 h-px bg-border" />}
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <span className="text-[13px] text-muted-foreground">{item.label}</span>
                    <span className="max-w-[60%] truncate text-[13px] font-semibold text-foreground">
                      {item.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Quick stats ────────────────────────────────── */}
            <div className="mt-3 grid grid-cols-3 gap-2.5">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-border bg-card px-2 py-3.5 text-center"
                >
                  <div className="truncate font-display text-[20px] font-bold text-primary">{stat.value}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* ── Contact hints (real user data, decorative) ─── */}
            <div className="mt-3 flex flex-col gap-2">
              <div className="flex items-center gap-2.5 rounded-2xl bg-bele-green-muted px-4 py-3 text-[12px] text-primary">
                <Phone size={14} /> +91 {profile.phone}
              </div>
              {profile.location && (
                <div className="flex items-center gap-2.5 rounded-2xl bg-bele-soil-muted px-4 py-3 text-[12px] text-secondary">
                  <MapPin size={14} /> {profile.location}
                </div>
              )}
              <div className="flex items-center gap-2.5 rounded-2xl bg-muted px-4 py-3 text-[12px] text-muted-foreground">
                <CalendarDays size={14} /> Member since {formatDate(profile.createdAt)}
              </div>
            </div>

            {/* ── Sign Out ───────────────────────────────────── */}
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="mt-4 w-full rounded-[18px] border-[1.5px] border-secondary py-4 text-sm font-bold text-secondary transition hover:bg-secondary/5 disabled:opacity-50"
            >
              {signingOut ? "Signing out…" : "Sign Out"}
            </button>
          </div>
        </>
      ) : null}
    </OwnerShell>
  )
}
