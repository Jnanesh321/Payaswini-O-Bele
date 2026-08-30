"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import Image from "next/image"
import { Loader2, ArrowRight, Check } from "lucide-react"
import { Button } from "@/components/ui"

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
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [fetching, setFetching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  // Redirect to login if unauthenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`)
    }
  }, [status, router])

  // Fetch current user capabilities
  useEffect(() => {
    if (status === "authenticated") {
      const loadCapabilities = async () => {
        setFetching(true)
        try {
          const res = await fetch("/api/user/capabilities")
          const data = await res.json()
          if (data.success && Array.isArray(data.capabilities)) {
            setSelectedRoles(data.capabilities)
          }
        } catch (err) {
          console.error("Failed to load capabilities:", err)
        } finally {
          setFetching(false)
        }
      }
      loadCapabilities()
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
        body: JSON.stringify({ capabilities: selectedRoles }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to save capabilities")
        return
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
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-4 font-sans text-[#1C1208]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[390px] bg-[#FDFBF7] min-h-[85vh] flex flex-col justify-between"
      >
        {/* Welcome Header */}
        <div className="pt-6">
          <div className="relative w-12 h-12 mb-5">
            <Image
              src="/images/brand-icon.webp"
              alt="O~Bele Icon"
              fill
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-[30px] font-bold text-[#143626] font-heading leading-tight tracking-tight">
            What brings you to O~Bele?
          </h1>
          <p className="text-[14px] text-[#6B706E] font-medium leading-relaxed mt-3">
            Choose your journey on Karnataka&apos;s primary community machinery hub.{" "}
            <span className="text-[#C85A32] font-semibold">Select all that apply.</span>
          </p>
        </div>

        {/* Roles List */}
        <div className="space-y-4 my-6 flex-1 flex flex-col justify-center">
          {roleOptions.map((role) => {
            const isSelected = selectedRoles.includes(role.id)
            return (
              <motion.div
                key={role.id}
                onClick={() => toggleRole(role.id)}
                whileTap={{ scale: 0.99 }}
                className={`relative flex items-center p-4 rounded-2xl border cursor-pointer transition-all duration-300 shadow-[0_2px_8px_rgba(20,54,38,0.02)] ${
                  isSelected
                    ? "bg-[#F9ECE6] border-[#C85A32]"
                    : "bg-white border-[#D5D9C9] hover:border-[#6B706E]"
                }`}
              >
                {/* Role Icon */}
                <div className="relative w-12 h-12 flex-shrink-0 bg-transparent">
                  <Image
                    src={role.icon}
                    alt={role.title}
                    fill
                    className="object-contain"
                  />
                </div>

                {/* Details */}
                <div className="ml-4 mr-8 flex-1">
                  <h3 className="text-[17px] font-bold text-[#143626] leading-tight tracking-tight">
                    {role.title}
                  </h3>
                  <p className="text-[12px] text-[#6B706E] font-medium leading-tight mt-1.5">
                    {role.description}
                  </p>
                </div>

                {/* Checkbox Icon */}
                <div
                  className={`absolute right-4 w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-200 ${
                    isSelected
                      ? "bg-[#C85A32] border-[#C85A32]"
                      : "bg-white border-[#D5D9C9]"
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Check className="h-3.5 w-3.5 text-white stroke-[3.5]" />
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
              className="text-xs text-[#C0392B] font-semibold text-center"
            >
              {error}
            </motion.p>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="pt-4 border-t border-[#F2ECE1] bg-transparent">
          <p className="text-[10px] text-[#6B706E] text-center font-medium leading-normal tracking-wide">
            By continuing, you agree to local cooperative guidelines.
          </p>

          <Button
            onClick={handleContinue}
            className="w-full bg-[#C85A32] hover:bg-[#B24D28] text-white font-bold h-14 rounded-xl flex items-center justify-center gap-2 mt-4 transition-all shadow-[0_4px_12px_rgba(200,90,50,0.2)] active:scale-[0.98] disabled:opacity-50"
            disabled={saving || selectedRoles.length === 0}
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            ) : (
              <>
                <span className="text-[15px] tracking-wide">Continue</span>
                <ArrowRight className="h-[18px] w-[18px] stroke-[2.5]" />
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
