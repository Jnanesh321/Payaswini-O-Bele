"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { motion } from "framer-motion"
import Image from "next/image"
import { AppLogo } from "@/components/ui/app-logo"
import { Loader2, ArrowRight, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui"

export default function VerifyOTPPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const phone = searchParams.get("phone") || ""
  const callbackUrl = searchParams.get("callbackUrl") || "/"
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [timer, setTimer] = useState(30)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Format phone number nicely (e.g. 98450 12345)
  const formattedPhone = phone.length === 10
    ? `${phone.slice(0, 5)} ${phone.slice(5)}`
    : phone

  // Countdown timer for Resend OTP
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1)
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [timer])

  const handleChange = (index: number, value: string) => {
    // Only accept numeric inputs
    if (value && !/^\d$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    
    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        const newOtp = [...otp]
        newOtp[index - 1] = ""
        setOtp(newOtp)
        inputRefs.current[index - 1]?.focus()
      } else {
        const newOtp = [...otp]
        newOtp[index] = ""
        setOtp(newOtp)
      }
    }
  }

  const handleVerify = async () => {
    if (!phone) {
      router.push("/login")
      return
    }
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp: otp.join("") }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Invalid OTP")
        return
      }
      
      const result = await signIn("phone", { phone, token: data.token || data.data?.token, redirect: false })
      if (result?.ok) {
        // Query capability state to see if they need onboarding
        try {
          const capRes = await fetch("/api/user/capabilities")
          const capData = await capRes.json()
          if (capData.success && !capData.hasCapabilities) {
            router.push(`/onboarding?callbackUrl=${encodeURIComponent(callbackUrl)}`)
            router.refresh()
            return
          }
        } catch (err) {
          console.error("Failed to check capabilities:", err)
        }
        router.push(callbackUrl)
        router.refresh()
      } else {
        setError("Sign in failed. Please try again.")
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setLoading(true)
    setError("")
    setOtp(["", "", "", "", "", ""])
    try {
      await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      })
      setTimer(30)
    } catch {
      setError("Failed to resend OTP")
    } finally {
      setLoading(false)
    }
  }

  if (!phone) {
    return (
      <div className="min-h-screen bg-background dark:bg-[#121512] flex items-center justify-center p-4 font-sans text-foreground">
        <div className="bg-card dark:bg-card/90 rounded-2xl p-8 border border-border text-center max-w-sm w-full shadow-sm">
          <p className="text-muted-foreground mb-6 font-semibold">No phone number provided.</p>
          <Button
            onClick={() => router.push("/login")}
            className="w-full bg-[#143626] hover:bg-[#1E3A0F] text-white font-bold h-12 rounded-xl"
          >
            Go to Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background dark:bg-[#121512] flex flex-col items-center justify-center p-4 font-sans text-foreground transition-colors duration-200">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[390px] min-h-[85vh] flex flex-col justify-between"
      >
        {/* Brand Header */}
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
              Verify OTP
            </h2>
            <p className="text-[13px] text-muted-foreground font-sans mt-2 leading-relaxed font-medium">
              Enter the OTP sent to <span className="font-bold text-foreground">+91 {formattedPhone}</span>
            </p>

            {/* Verification label and change number */}
            <div className="flex items-center justify-between mt-6">
              <label className="text-[11px] font-bold text-[#6B706E] tracking-wider uppercase">
                Verification Code
              </label>
              <button
                onClick={() => router.push(`/login?phone=${phone}&callbackUrl=${callbackUrl}`)}
                className="text-[12px] font-bold text-[#C85A32] hover:underline inline-flex items-center gap-1 focus:outline-none"
              >
                <ArrowLeft className="h-3 w-3" /> Change
              </button>
            </div>

            {/* Digit boxes */}
            <div className="flex justify-between gap-1.5 mt-2.5">
              {otp.map((digit, i) => {
                const isActive = otp.findIndex((val) => val === "") === i
                return (
                  <div
                    key={i}
                    onClick={() => inputRefs.current[i]?.focus()}
                    className="relative flex-1 aspect-square max-h-[46px] min-h-[40px] bg-white border border-[#D5D9C9] rounded-xl flex items-center justify-center cursor-text transition-all focus-within:border-[#2D5016] focus-within:ring-1 focus-within:ring-[#2D5016]"
                  >
                    <input
                      ref={(el) => {
                        inputRefs.current[i] = el
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleChange(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      className="absolute inset-0 w-full h-full text-center text-[20px] font-bold text-[#143626] bg-transparent border-0 outline-none p-0 focus:ring-0 focus:outline-none"
                    />
                    {/* Flashing Caret if active and empty */}
                    {isActive && !digit && (
                      <motion.div
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                        className="w-[2dp] h-5 bg-[#C85A32] rounded"
                      />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Resend Timer Info */}
            <div className="flex items-center justify-between mt-6 text-[13px] text-[#6B706E]">
              <span className="font-medium">Didn&apos;t receive the OTP?</span>
              {timer > 0 ? (
                <span className="font-bold text-[#C85A32]">
                  Resend in 0:{timer < 10 ? `0${timer}` : timer}
                </span>
              ) : (
                <button
                  onClick={handleResend}
                  className="font-bold text-[#C85A32] hover:underline focus:outline-none"
                >
                  Resend OTP
                </button>
              )}
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-[#C0392B] font-semibold mt-4 text-center"
              >
                {error}
              </motion.p>
            )}
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
              onClick={handleVerify}
              className="w-full bg-[#143626] hover:bg-[#1E3A0F] text-white font-bold h-14 rounded-xl flex items-center justify-center gap-2 mt-4 transition-all shadow-[0_4px_12px_rgba(20,54,38,0.2)] active:scale-[0.98] disabled:opacity-50"
              disabled={otp.some((d) => !d) || loading}
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
