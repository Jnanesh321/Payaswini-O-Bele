"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { motion } from "framer-motion"
import Image from "next/image"
import { AppLogo } from "@/components/ui/app-logo"
import { Loader2, ArrowRight, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui"
import { OtpBoxedInput } from "@/components/otp/otp-boxed-input"

export default function VerifyOTPPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const phone = searchParams.get("phone") || ""
  const callbackUrl = searchParams.get("callbackUrl") || "/"
  const devOtpParam = searchParams.get("devOtp") || ""
  const [devOtp, setDevOtp] = useState(devOtpParam)
  const [otpCode, setOtpCode] = useState(devOtpParam)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Format phone number nicely (e.g. 98450 12345)
  const formattedPhone = phone.length === 10
    ? `${phone.slice(0, 5)} ${phone.slice(5)}`
    : phone

  const handleVerify = async (codeToVerify?: string) => {
    if (!phone) {
      router.push("/login")
      return
    }
    const finalOtp = codeToVerify || otpCode || ""
    if (!finalOtp || finalOtp.length !== 6) return

    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp: finalOtp }),
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

  // WebOTP API listener for automatic SMS retrieval on mobile devices
  useEffect(() => {
    if (typeof window === "undefined" || !("OTPCredential" in window)) return
    const ac = new AbortController()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(navigator.credentials as any)
      ?.get({
        otp: { transport: ["sms"] },
        signal: ac.signal,
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((content: any) => {
        if (content?.code) {
          setOtpCode(content.code)
          handleVerify(content.code)
        }
      })
      .catch(() => {})
    return () => ac.abort()
  }, [phone, otpCode, callbackUrl])

  const handleResend = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json()
      if (data.devOtp) {
        setDevOtp(data.devOtp)
      }
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

        {/* Input Card with OpenSource UI OtpBoxedInput */}
        <div className="bg-card dark:bg-card/90 rounded-2xl p-5 border border-border shadow-md flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-1">
              <button
                type="button"
                onClick={() => router.push(`/login?phone=${phone}&callbackUrl=${callbackUrl}`)}
                className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 focus:outline-none"
              >
                <ArrowLeft className="h-3 w-3" /> Change Number
              </button>
            </div>

            <OtpBoxedInput
              length={6}
              destination={`+91 ${formattedPhone}`}
              label="Verify Phone Number"
              hint={`Enter the 6-digit code sent to +91 ${formattedPhone}`}
              error={!!error}
              errorMessage={error || "Invalid OTP code"}
              resendCooldown={30}
              value={otpCode}
              onChange={setOtpCode}
              onResend={handleResend}
              onComplete={(code) => handleVerify(code)}
              className="px-0 py-2"
            />

            {/* Dev Mode & Master OTP helper */}
            {devOtp ? (
              <div className="mt-3 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setOtpCode(devOtp)
                    handleVerify(devOtp)
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Dev OTP: <strong className="font-mono tracking-wider">{devOtp}</strong></span>
                  <span className="text-[11px] font-normal underline ml-1">Tap to auto-fill</span>
                </button>
              </div>
            ) : (
              <div className="mt-3 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setOtpCode("123456")
                    handleVerify("123456")
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-muted-foreground bg-muted/40 hover:bg-muted/70 hover:text-foreground border border-border/60 transition-colors"
                >
                  <span>No SMS gateway yet? Tap to use master code</span>
                  <span className="font-mono font-bold text-primary underline">123456</span>
                </button>
              </div>
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
              onClick={() => handleVerify(otpCode)}
              className="w-full bg-[#143626] hover:bg-[#1E3A0F] text-white font-bold h-14 rounded-xl flex items-center justify-center gap-2 mt-4 transition-all shadow-[0_4px_12px_rgba(20,54,38,0.2)] active:scale-[0.98] disabled:opacity-50"
              disabled={otpCode.length !== 6 || loading}
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
