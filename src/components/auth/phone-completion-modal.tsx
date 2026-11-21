"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Phone, CheckCircle2, Loader2, ArrowRight, X } from "lucide-react"
import { Button } from "@/components/ui"

export interface PhoneCompletionModalProps {
  isOpen: boolean
  onClose?: () => void
  onSuccess: (phone: string) => void
  canDismiss?: boolean
}

export function PhoneCompletionModal({
  isOpen,
  onClose,
  onSuccess,
  canDismiss = false,
}: PhoneCompletionModalProps) {
  const [phone, setPhone] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const cleanPhone = phone.replace(/\D/g, "")
  const isPhoneValid = cleanPhone.length === 10

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!isPhoneValid) {
      setError("Please enter a valid 10-digit mobile number")
      return
    }

    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/user/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone }),
      })

      const contentType = res.headers.get("content-type") || ""
      let data: any = null

      if (contentType.includes("application/json")) {
        try {
          data = await res.json()
        } catch {
          data = null
        }
      } else {
        const rawText = await res.text()
        console.error("[PhoneModal] Expected JSON from /api/user/phone but received non-JSON:", {
          status: res.status,
          statusText: res.statusText,
          contentType,
          snippet: rawText.slice(0, 300),
        })
        throw new Error(
          `Server returned ${res.status} ${res.statusText || "Error"} (non-JSON response). Please check server logs.`
        )
      }

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `Failed to update phone number (Status ${res.status})`)
      }

      onSuccess(data.user?.phone || `91${cleanPhone}`)
      if (onClose) onClose()
    } catch (err: unknown) {
      console.error("Phone update error:", err)
      setError(err instanceof Error ? err.message : "Failed to update phone number")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs p-0 sm:items-center sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={canDismiss ? onClose : undefined}
            className="absolute inset-0"
          />

          {/* Modal / Sheet */}
          <motion.div
            initial={{ y: "100%", opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="relative z-10 flex w-full max-w-[420px] flex-col rounded-t-3xl sm:rounded-2xl border border-border bg-[#FFFFFF] dark:bg-card p-6 shadow-2xl overflow-hidden pb-safe text-foreground"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#2D5016]/10 text-[#2D5016]">
                  <Phone size={20} />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">
                    One Last Step: Contact Number
                  </h3>
                  <p className="text-[12px] text-muted-foreground font-medium">
                    Required for field handovers
                  </p>
                </div>
              </div>

              {canDismiss && onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted transition"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            <p className="mt-3 text-[13px] text-muted-foreground leading-relaxed">
              Enter your 10-digit WhatsApp / Mobile number so tool owners and dispatch operators can coordinate machinery handovers at your farm.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="completion-phone"
                  className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block"
                >
                  Mobile / WhatsApp Number
                </label>
                <div className="flex items-center bg-[#FDFBF7] dark:bg-background border border-[#D5D9C9] dark:border-border rounded-xl px-4 py-3 mt-1.5 focus-within:border-[#2D5016] focus-within:ring-1 focus-within:ring-[#2D5016] transition-all">
                  <span className="text-[15px] font-bold text-muted-foreground tracking-tight">
                    +91
                  </span>
                  <div className="h-4 w-[1px] bg-[#D5D9C9] dark:bg-border mx-3" />
                  <input
                    id="completion-phone"
                    type="tel"
                    placeholder="98450 12345"
                    className="bg-transparent border-0 outline-none p-0 text-[15px] font-bold text-foreground w-full placeholder-muted-foreground focus:ring-0 focus:outline-none"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    autoFocus
                  />
                  {isPhoneValid && (
                    <div className="ml-2 text-[#3D6B1F]">
                      <CheckCircle2 className="h-5 w-5 fill-[#3D6B1F] text-white" />
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-600 font-semibold">{error}</p>
              )}

              <Button
                type="submit"
                disabled={loading || !isPhoneValid}
                className="w-full bg-[#143626] hover:bg-[#1E3A0F] text-white font-bold h-12 rounded-xl flex items-center justify-center gap-2 mt-2 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                ) : (
                  <>
                    <span>Save & Continue</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
