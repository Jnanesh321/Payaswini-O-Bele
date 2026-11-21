"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "@/components/providers/session-provider"
import { motion } from "framer-motion"
import Image from "next/image"
import { AppLogo } from "@/components/ui/app-logo"
import { Loader2, ArrowRight, Check, User, MapPin } from "lucide-react"
import { Button } from "@/components/ui"
import { REGIONAL_TALUKS } from "@/lib/geo"

interface RoleOption {
  id: string
  title: string
  description: string
  icon: string
}

const roleOptions: RoleOption[] = [
  {
    id: "FARMER",
    title: "I need to rent tools",
    description: "Find tillers, harvesters & tractors nearby",
    icon: "/images/role-farmer.webp",
  },
  {
    id: "TOOL_OWNER",
    title: "I have tools to rent out",
    description: "List your equipment & start earning",
    icon: "/images/role-owner.webp",
  },
  {
    id: "OPERATOR",
    title: "I can operate equipment",
    description: "Get hired for harvesting and tilling shifts",
    icon: "/images/role-operator.webp",
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/"
  
  const { status } = useSession()
  const [name, setName] = useState("")
  const [taluk, setTaluk] = useState("")
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["FARMER"])
  const [fetching, setFetching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  // Redirect to login if unauthenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`)
    }
  }, [status, router])

  // Fetch current user capabilities & profile
  useEffect(() => {
    if (status === "authenticated") {
      const loadProfile = async () => {
        setFetching(true)
        try {
          const res = await fetch("/api/user/capabilities")
          const data = await res.json()
          if (data.success) {
            if (Array.isArray(data.capabilities) && data.capabilities.length > 0) {
              setSelectedRoles(data.capabilities)
            }
            if (data.user?.name && !/^Farmer\s+\d+$/i.test(data.user.name.trim())) {
              setName(data.user.name)
            }
            if (data.user?.taluk) {
              setTaluk(data.user.taluk)
            }
          }
        } catch (err) {
          console.error("Failed to load profile:", err)
        } finally {
          setFetching(false)
        }
      }
      loadProfile()
    }
  }, [status])

  const toggleRole = (roleId: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId)
        ? prev.filter((r) => r !== roleId)
        : [...prev, roleId]
    )
  }

  const handleContinue = async () => {
    if (!name.trim()) {
      setError("Please enter your name to complete registration.")
      return
    }
    if (selectedRoles.length === 0) {
      setError("Please select at least one role to continue.")
      return
    }
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/user/capabilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          capabilities: selectedRoles,
          name: name.trim(),
          taluk: taluk || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to save profile")
        return
      }

      // Smart destination based on single-role selection if default callback
      if (callbackUrl === "/" || !callbackUrl) {
        if (selectedRoles.length === 1 && selectedRoles[0] === "TOOL_OWNER") {
          router.push("/owner")
          router.refresh()
          return
        }
        if (selectedRoles.length === 1 && selectedRoles[0] === "OPERATOR") {
          router.push("/operator")
          router.refresh()
          return
        }
      }

      // Redirect on success
      router.push(callbackUrl)
      router.refresh()
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  if (status === "loading" || fetching) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center font-sans">
        <Loader2 className="h-10 w-10 animate-spin text-[#143626]" />
        <p className="mt-4 text-sm font-semibold text-[#6B706E]">Loading profile...</p>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center font-sans">
        <Loader2 className="h-6 w-6 animate-spin text-[#143626]" />
        <p className="mt-2 text-sm font-semibold text-[#6B706E]">Redirecting to Login...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background dark:bg-[#121512] flex flex-col items-center justify-center p-4 font-sans text-foreground transition-colors duration-200">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[420px] min-h-[85vh] flex flex-col justify-between py-4"
      >
        {/* Welcome Header */}
        <div className="pt-2">
          <div className="rounded-2xl p-2 mb-2 inline-block">
            <AppLogo width={140} height={50} className="h-10 w-auto" priority />
          </div>
          <h1 className="text-[26px] font-bold text-foreground font-heading leading-tight tracking-tight">
            Welcome to O~Bele
          </h1>
          <p className="text-[13px] text-muted-foreground font-medium leading-relaxed mt-1.5">
            Tell us your name and choose what brings you to Karnataka&apos;s community machinery hub.
          </p>
        </div>

        {/* Profile Details (Name & Location) */}
        <div className="my-5 space-y-3.5 bg-card/60 dark:bg-card/40 border border-border/80 rounded-2xl p-4 shadow-sm">
          <div>
            <label className="text-[11px] font-bold text-[#6B706E] dark:text-[#A1A7A4] tracking-wider uppercase block" htmlFor="onboard-name">
              Your Full Name <span className="text-[#C85A32]">*</span>
            </label>
            <div className="flex items-center bg-[#FDFBF7] dark:bg-[#1A1F1A] border border-[#D5D9C9] dark:border-[#2D382D] rounded-xl px-3.5 py-2.5 mt-1 focus-within:border-[#2D5016] focus-within:ring-1 focus-within:ring-[#2D5016] transition-all">
              <User className="h-4 w-4 text-muted-foreground mr-2.5 flex-shrink-0" />
              <input
                id="onboard-name"
                type="text"
                placeholder="e.g. Jnanesh Sharma"
                className="bg-transparent border-0 outline-none p-0 text-[14px] font-semibold text-foreground w-full placeholder:text-muted-foreground focus:ring-0 focus:outline-none"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (error) setError("")
                }}
                required
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#6B706E] dark:text-[#A1A7A4] tracking-wider uppercase block" htmlFor="onboard-taluk">
              Nearest Hub / Taluk
            </label>
            <div className="flex items-center bg-[#FDFBF7] dark:bg-[#1A1F1A] border border-[#D5D9C9] dark:border-[#2D382D] rounded-xl px-3.5 py-2.5 mt-1 focus-within:border-[#2D5016] focus-within:ring-1 focus-within:ring-[#2D5016] transition-all">
              <MapPin className="h-4 w-4 text-muted-foreground mr-2.5 flex-shrink-0" />
              <select
                id="onboard-taluk"
                value={taluk}
                onChange={(e) => setTaluk(e.target.value)}
                className="bg-transparent border-0 outline-none p-0 text-[14px] font-semibold text-foreground w-full focus:ring-0 focus:outline-none cursor-pointer"
              >
                <option value="" className="text-muted-foreground bg-card">Select nearest regional hub</option>
                {REGIONAL_TALUKS.map((t) => (
                  <option key={t.id} value={t.name} className="text-foreground bg-card">
                    {t.name} ({t.district})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Roles List */}
        <div className="space-y-3 mb-4 flex-1 flex flex-col justify-center">
          <div className="flex items-center justify-between px-1">
            <span className="text-[12px] font-bold text-[#6B706E] dark:text-[#A1A7A4] uppercase tracking-wider">
              I want to:
            </span>
            <span className="text-[11px] text-[#C85A32] font-semibold">
              Select all that apply
            </span>
          </div>

          {roleOptions.map((role) => {
            const isSelected = selectedRoles.includes(role.id)
            return (
              <motion.div
                key={role.id}
                onClick={() => {
                  toggleRole(role.id)
                  if (error) setError("")
                }}
                whileTap={{ scale: 0.99 }}
                className={`relative flex items-center p-3.5 rounded-2xl border cursor-pointer transition-all duration-300 shadow-sm ${
                  isSelected
                    ? "bg-primary/10 border-primary dark:bg-primary/20 shadow-[0_2px_8px_rgba(45,80,22,0.12)]"
                    : "bg-card border-border hover:border-primary/50"
                }`}
              >
                {/* Role Icon */}
                <div className="relative w-11 h-11 flex-shrink-0 bg-transparent">
                  <Image
                    src={role.icon}
                    alt={role.title}
                    fill
                    className="object-contain"
                  />
                </div>

                {/* Details */}
                <div className="ml-3.5 mr-7 flex-1">
                  <h3 className="text-[15px] font-bold text-foreground leading-tight tracking-tight">
                    {role.title}
                  </h3>
                  <p className="text-[12px] text-muted-foreground font-medium leading-tight mt-1">
                    {role.description}
                  </p>
                </div>

                {/* Checkbox Icon */}
                <div
                  className={`absolute right-3.5 w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-200 ${
                    isSelected
                      ? "bg-primary border-primary"
                      : "bg-background border-border"
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Check className="h-3 w-3 text-primary-foreground stroke-[3.5]" />
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )
          })}

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-[#C0392B] font-semibold text-center mt-2"
            >
              {error}
            </motion.p>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="pt-3 border-t border-[#F2ECE1] dark:border-[#2D382D] bg-transparent">
          <p className="text-[10px] text-[#6B706E] text-center font-medium leading-normal tracking-wide">
            By continuing, you agree to local cooperative guidelines.
          </p>

          <Button
            onClick={handleContinue}
            className="w-full bg-[#143626] hover:bg-[#1E3A0F] text-white font-bold h-13 rounded-xl flex items-center justify-center gap-2 mt-3 transition-all shadow-[0_4px_12px_rgba(20,54,38,0.2)] active:scale-[0.98] disabled:opacity-50"
            disabled={saving || !name.trim() || selectedRoles.length === 0}
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            ) : (
              <>
                <span className="text-[15px] tracking-wide">Complete Setup & Continue</span>
                <ArrowRight className="h-[18px] w-[18px] stroke-[2.5]" />
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
