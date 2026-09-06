"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import Image from "next/image"
import { AppLogo } from "@/components/ui/app-logo"
import { Loader2, CheckCircle2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/"
  const [phone, setPhone] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [sent, setSent] = useState(false)

  const cleanPhone = phone.replace(/\D/g, "")
  const isPhoneValid = cleanPhone.length === 10

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isPhoneValid) {
      setError("Please enter a valid 10-digit phone number")
      return
    }
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to send OTP")
        return
      }
      setSent(true)
      const params = new URLSearchParams({ phone: cleanPhone, callbackUrl })
      router.push(`/verify-otp?${params}`)
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background dark:bg-[#121512] flex flex-col items-center justify-center p-4 font-sans text-foreground transition-colors duration-200">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[390px] min-h-[85vh] flex flex-col justify-between"
      >
        {/* Brand Header with official SVG logo */}
        <div className="pt-6 text-center">
          <Link href="/" className="inline-block">
            <div className="rounded-2xl p-2.5 mb-2 inline-block transition-transform hover:scale-105">
              <AppLogo width={150} height={53} className="h-12 w-auto mx-auto" priority />
            </div>
          </Link>
          <p className="text-[13px] text-muted-foreground font-sans font-medium tracking-wide">
            Farm tools, shared.
          </p>
        </div>

        {/* Scenic Illustration (Light: Sun / Green Farm | Dark: Moonlit Starry Farm) */}
        <div className="relative w-full h-[130px] my-6 rounded-2xl overflow-hidden shadow-sm border border-border/50">
          <Image
            src="/images/scenic-illustration.webp"
            alt="Scenic Farm Illustration (Day)"
            fill
            className="object-cover block dark:hidden"
            priority
          />
          <Image
            src="/images/scenic-night-illustration.webp"
            alt="Scenic Farm Illustration (Night)"
            fill
            className="object-cover hidden dark:block"
            priority
          />
        </div>

        {/* Input Card */}
        <div className="bg-card dark:bg-card/90 rounded-2xl p-6 border border-border shadow-[0_4px_12px_rgba(45,80,22,0.05)] flex-1 flex flex-col justify-between">
          <div>
            <h2 className="text-[21px] font-bold text-foreground font-heading tracking-tight leading-snug">
              Verify your phone number
            </h2>
            <p className="text-[13px] text-muted-foreground font-sans mt-2 leading-relaxed font-medium">
              Enter your mobile number to receive a 6-digit verification code.
            </p>

            <form onSubmit={handlePhoneLogin} className="mt-6">
              <div>
                <label className="text-[11px] font-bold text-[#6B706E] tracking-wider uppercase block" htmlFor="phone">
                  Phone Number
                </label>
                <div className="flex items-center bg-[#FDFBF7] border border-[#D5D9C9] rounded-xl px-4 py-3 mt-2 focus-within:border-[#2D5016] focus-within:ring-1 focus-within:ring-[#2D5016] transition-all">
                  <span className="text-[15px] font-bold text-[#6B706E] tracking-tight">
                    +91
                  </span>
                  <div className="h-4 w-[1px] bg-[#D5D9C9] mx-3" />
                  <input
                    id="phone"
                    type="tel"
                    placeholder="98450 12345"
                    className="bg-transparent border-0 outline-none p-0 text-[15px] font-bold text-[#1F2421] w-full placeholder-[#98A2B3] focus:ring-0 focus:outline-none"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                  {isPhoneValid && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="ml-2 text-[#3D6B1F]"
                    >
                      <CheckCircle2 className="h-5 w-5 fill-[#3D6B1F] text-white" />
                    </motion.div>
                  )}
                </div>
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-[#C0392B] font-semibold mt-3"
                >
                  {error}
                </motion.p>
              )}
            </form>
          </div>

          {/* Sticky Bottom Actions */}
          <div className="mt-8 pt-4 border-t border-[#F2ECE1]">
            <p className="text-[11px] text-[#6B706E] text-center font-medium leading-normal">
              By continuing, you agree to O~Bele&apos;s{" "}
              <span className="text-[#C85A32] font-semibold hover:underline cursor-pointer">
                Terms of Service
              </span>{" "}
              &{" "}
              <span className="text-[#C85A32] font-semibold hover:underline cursor-pointer">
                Privacy Policy
              </span>.
            </p>

            <Button
              onClick={handlePhoneLogin}
              className="w-full bg-[#143626] hover:bg-[#1E3A0F] text-white font-bold h-14 rounded-xl flex items-center justify-center gap-2 mt-4 transition-all shadow-[0_4px_12px_rgba(20,54,38,0.2)] active:scale-[0.98] disabled:opacity-50"
              disabled={loading || sent || !isPhoneValid}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              ) : (
                <>
                  <span className="text-[15px] tracking-wide">Verify & Continue</span>
                  <ArrowRight className="h-[18px] w-[18px] stroke-[2.5]" />
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
