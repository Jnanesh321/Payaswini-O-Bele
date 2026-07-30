"use client"

import { useState, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { motion } from "framer-motion"
import { Sprout, ArrowLeft, Loader2 } from "lucide-react"
import { Button, Card } from "@/components/ui"

export default function VerifyOTPPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const phone = searchParams.get("phone") || ""
  const callbackUrl = searchParams.get("callbackUrl") || "/"
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) return
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
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
      const result = await signIn("phone", { phone, redirect: false })
      if (result?.ok) {
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
    } catch {
      setError("Failed to resend OTP")
    } finally {
      setLoading(false)
    }
  }

  if (!phone) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
        <Card className="p-8 text-center max-w-md">
          <p className="text-muted-foreground mb-4">No phone number provided.</p>
          <Button onClick={() => router.push("/login")}>Go to Login</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Sprout className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Verify OTP</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter the OTP sent to <span className="font-medium">+91 {phone}</span>
            </p>
          </div>

          <div className="flex justify-center gap-2 mb-6">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="flex h-14 w-12 items-center justify-center rounded-lg border border-border bg-background text-center text-xl font-bold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            ))}
          </div>

          {error && <p className="text-sm text-destructive text-center mb-4">{error}</p>}

          <Button
            onClick={handleVerify}
            className="w-full"
            size="lg"
            disabled={otp.some((d) => !d) || loading}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify"}
          </Button>

          <div className="mt-4 text-center">
            <button
              onClick={handleResend}
              disabled={loading}
              className="text-sm text-primary hover:underline disabled:opacity-50"
            >
              Resend OTP
            </button>
          </div>

          <div className="mt-4 text-center">
            <button
              onClick={() => router.push("/login")}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="h-3 w-3" /> Change phone number
            </button>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
