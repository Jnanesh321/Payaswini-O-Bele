"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { AppLogo } from "@/components/ui/app-logo"
import { Loader2, CheckCircle2, ArrowRight, ArrowLeft, Sun, Moon, Monitor } from "lucide-react"
import { Button } from "@/components/ui"
import { OtpBoxedInput } from "@/components/otp/otp-boxed-input"
import { getClientAuth, isFirebaseConfigured } from "@/lib/firebase/client"
import { isNativePlatform } from "@/lib/platform"
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth"
import { GoogleSignInButton, PhoneCompletionModal } from "@/components/auth"
import { useTheme } from "next-themes"
import { useMounted } from "@/hooks/use-mounted"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialPhone = searchParams.get("phone") || ""
  const callbackUrl = searchParams.get("callbackUrl") || "/"
  const { theme, setTheme, resolvedTheme } = useTheme()
  const mounted = useMounted()
  const effectiveTheme = mounted ? (resolvedTheme || "light") : "light"
  const isDark = effectiveTheme === "dark"

  const [step, setStep] = useState<"phone" | "otp">("phone")
  const [phone, setPhone] = useState(initialPhone)
  const [otpCode, setOtpCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPhoneModal, setShowPhoneModal] = useState(false)
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)
  const [nativeVerificationId, setNativeVerificationId] = useState<string | null>(null)
  const isDevMode = !isFirebaseConfigured()
  const missingClientEnv: string[] = []
  if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) missingClientEnv.push("NEXT_PUBLIC_FIREBASE_API_KEY")
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) missingClientEnv.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID")
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null)

  // Log Firebase status for debugging
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || isDevMode) {
      console.log("[O~Bele Auth] Client Firebase status:", {
        isConfigured: !isDevMode,
        hasApiKey: Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
        hasProjectId: Boolean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
        missing: missingClientEnv,
      })
    }
  }, [isDevMode, missingClientEnv])

  const cleanPhone = phone.replace(/\D/g, "")
  const isPhoneValid = cleanPhone.length === 10

  // Format phone number nicely (e.g. 98450 12345)
  const formattedPhone = cleanPhone.length === 10
    ? `${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}`
    : cleanPhone

  // Check for Google redirect result (for Capacitor WebView or mobile browser redirect logins)
  useEffect(() => {
    if (isFirebaseConfigured()) {
      const auth = getClientAuth()
      if (auth) {
        import("firebase/auth")
          .then(({ getRedirectResult }) => {
            getRedirectResult(auth)
              .then(async (credential) => {
                if (credential?.user) {
                  setLoading(true)
                  const idToken = await credential.user.getIdToken()
                  await completeSession(idToken)
                }
              })
              .catch((err) => {
                console.error("[O~Bele Auth] Google redirect result error:", err)
              })
          })
          .catch(() => {})
      }
    }
  }, [])

  // Remove native listeners on unmount
  useEffect(() => {
    return () => {
      if (isNativePlatform()) {
        import("@capacitor-firebase/authentication").then(({ FirebaseAuthentication }) => {
          FirebaseAuthentication.removeAllListeners().catch(() => {})
        }).catch(() => {})
      }
    }
  }, [])

  const completeSession = async (idToken: string) => {
    // Establish O~Bele authenticated session on server
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || "Authentication failed on server")
    }

    // If Google user or newly provisioned user needs phone number for handovers, prompt now
    if (data.user?.needsPhone) {
      setShowPhoneModal(true)
      return
    }

    // If newly provisioned user, show them what they want to do (rent, lend, operate)
    if (data.isNewUser) {
      router.push(`/onboarding?callbackUrl=${encodeURIComponent(callbackUrl)}`)
      router.refresh()
      return
    }

    // Check capabilities for onboarding routing (for users without assigned roles)
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
  }

  const handleVerifyOtp = async (codeToVerify?: string) => {
    const finalOtp = codeToVerify || otpCode
    if (!finalOtp || finalOtp.length !== 6) {
      setError("Please enter a valid 6-digit code")
      return
    }

    setLoading(true)
    setError("")

    try {
      let idToken = ""

      if (isNativePlatform() && nativeVerificationId) {
        // Native Android / iOS Firebase Phone verification
        const { FirebaseAuthentication } = await import("@capacitor-firebase/authentication")
        await FirebaseAuthentication.confirmVerificationCode({
          verificationId: nativeVerificationId,
          verificationCode: finalOtp,
        })
        const tokenResult = await FirebaseAuthentication.getIdToken()
        if (!tokenResult?.token) {
          throw new Error("Could not retrieve ID token from native authentication")
        }
        idToken = tokenResult.token
      } else if (confirmationResult) {
        // Live Web Firebase verification
        const credential = await confirmationResult.confirm(finalOtp)
        idToken = await credential.user.getIdToken()
      } else if (isDevMode) {
        // Dev/Mock verification
        idToken = `mock_firebase_${cleanPhone}`
      } else {
        throw new Error("Authentication session expired. Please request a new code.")
      }

      await completeSession(idToken)
    } catch (err: unknown) {
      console.error("OTP verification error:", err)
      const message = err instanceof Error ? err.message : "Verification failed. Please check the code."
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  // WebOTP API listener for automatic SMS retrieval on mobile devices
  useEffect(() => {
    if (step !== "otp" || typeof window === "undefined" || !("OTPCredential" in window)) return
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
          handleVerifyOtp(content.code)
        }
      })
      .catch(() => {})
    return () => ac.abort()
  }, [step, otpCode, confirmationResult, isDevMode, cleanPhone, callbackUrl, router])

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!isPhoneValid) {
      setError("Please enter a valid 10-digit phone number")
      return
    }

    setLoading(true)
    setError("")

    try {
      if (isNativePlatform()) {
        const { FirebaseAuthentication } = await import("@capacitor-firebase/authentication")
        await FirebaseAuthentication.removeAllListeners()

        await FirebaseAuthentication.addListener("phoneCodeSent", (event) => {
          setNativeVerificationId(event.verificationId)
          setStep("otp")
          setLoading(false)
        })

        await FirebaseAuthentication.addListener("phoneVerificationCompleted", async () => {
          try {
            setLoading(true)
            const tokenResult = await FirebaseAuthentication.getIdToken()
            if (tokenResult?.token) {
              await completeSession(tokenResult.token)
            }
          } catch (err) {
            console.error("Native instant verification session error:", err)
            setError("Failed to establish session after instant verification")
          } finally {
            setLoading(false)
          }
        })

        await FirebaseAuthentication.addListener("phoneVerificationFailed", (event) => {
          setError(event.message || "Phone verification failed")
          setLoading(false)
        })

        const phoneNumber = `+91${cleanPhone}`
        await FirebaseAuthentication.signInWithPhoneNumber({ phoneNumber })
        return
      }

      if (isFirebaseConfigured()) {
        const auth = getClientAuth()
        if (!auth) {
          throw new Error("Firebase Auth client could not be initialized")
        }

        // Initialize invisible reCAPTCHA if not already created
        if (!recaptchaVerifierRef.current) {
          recaptchaVerifierRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
            size: "invisible",
            callback: () => {
              // reCAPTCHA solved
            },
            "expired-callback": () => {
              setError("reCAPTCHA expired. Please try again.")
            },
          })
        }

        const phoneNumber = `+91${cleanPhone}`
        const confirmation = await signInWithPhoneNumber(
          auth,
          phoneNumber,
          recaptchaVerifierRef.current
        )
        setConfirmationResult(confirmation)
      } else {
        // Dev fallback when Firebase is not configured
        console.warn("[O~Bele Auth] Firebase not configured in environment. Using dev fallback authentication.")
      }

      setStep("otp")
    } catch (err: unknown) {
      console.error("Firebase Phone Auth error:", err)
      const message = err instanceof Error ? err.message : "Failed to send verification SMS"
      setError(message)
      // Reset recaptcha verifier on failure so user can retry
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear()
        } catch {}
        recaptchaVerifierRef.current = null
      }
    } finally {
      setLoading(false)
    }
  }



  return (
    <div className="min-h-screen bg-[#FAF7F0] dark:bg-[#0F150D] flex flex-col items-center justify-center p-4 font-sans text-neutral-900 dark:text-[#FAF7F0] transition-colors duration-200">
      {/* Invisible reCAPTCHA container for Firebase Phone Auth */}
      <div id="recaptcha-container" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[390px] min-h-[85vh] flex flex-col justify-between"
      >
        {/* Top Header Bar: Back to Home + Subtle Theme Toggle Pill */}
        <div className="flex items-center justify-between w-full pt-4 pb-2 px-1">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Home</span>
          </Link>

          {/* Theme Toggle Pill: Light / Dark / System */}
          <div
            className="inline-flex items-center p-0.5 rounded-full bg-neutral-100 dark:bg-[#1C2618] border border-neutral-200 dark:border-[#2C3A26] text-[11px] font-semibold"
            role="group"
            aria-label="Theme selector"
          >
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full transition-all ${
                mounted && theme === "light"
                  ? "bg-white dark:bg-[#2D5016] text-neutral-900 dark:text-white shadow-xs font-bold"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
              }`}
              title="Light theme"
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>Light</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full transition-all ${
                mounted && theme === "dark"
                  ? "bg-white dark:bg-[#2D5016] text-neutral-900 dark:text-white shadow-xs font-bold"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
              }`}
              title="Dark theme"
            >
              <Moon className="w-3.5 h-3.5 text-emerald-400" />
              <span>Dark</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme("system")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full transition-all ${
                mounted && theme === "system"
                  ? "bg-white dark:bg-[#2D5016] text-neutral-900 dark:text-white shadow-xs font-bold"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
              }`}
              title="System preference"
            >
              <Monitor className="w-3.5 h-3.5 text-blue-400" />
              <span>System</span>
            </button>
          </div>
        </div>

        {/* Brand Header with official SVG logo */}
        <div className="pt-2 text-center">
          <Link href="/" className="inline-block">
            <div className="rounded-2xl p-2 mb-1 inline-block transition-transform hover:scale-105">
              <AppLogo width={150} height={53} className="h-12 w-auto mx-auto" priority />
            </div>
          </Link>
          <p className="text-[13px] text-neutral-600 dark:text-neutral-400 font-sans font-medium tracking-wide">
            Farm tools, shared.
          </p>
        </div>

        {/* Scenic Illustration (Daytime farm when light, moonlit night farm when dark) */}
        <div className="relative w-full h-[130px] my-5 rounded-2xl overflow-hidden shadow-sm border border-neutral-200 dark:border-[#2C3A26]">
          <Image
            key={isDark ? "hero-dark" : "hero-light"}
            src={isDark ? "/images/scenic-night-illustration.webp" : "/images/scenic-illustration.webp"}
            alt={isDark ? "Scenic Farm Illustration (Night)" : "Scenic Farm Illustration (Day)"}
            fill
            className="object-cover transition-opacity duration-300"
            priority
          />
        </div>

        {/* Main Card with AnimatePresence for smooth transitions */}
        <div className="bg-white dark:bg-[#172014] rounded-2xl p-6 border border-neutral-200 dark:border-[#2C3A26] shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.35)] flex-1 flex flex-col justify-between transition-colors">
          <AnimatePresence mode="wait">
            {step === "phone" ? (
              <motion.div
                key="phone-step"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col justify-between"
              >
                <div>
                  <h2 className="text-[21px] font-bold text-neutral-900 dark:text-[#FAF7F0] font-heading tracking-tight leading-snug">
                    Sign in to Payaswini O~Bele
                  </h2>
                  <p className="text-[13px] text-neutral-600 dark:text-neutral-400 font-sans mt-1.5 leading-relaxed font-medium">
                    Fast, secure login for farmers and machinery owners.
                  </p>

                  {/* ── Primary Option: Zero-Cost Google Sign-In ── */}
                  <div className="mt-5">
                    <GoogleSignInButton
                      onSuccess={completeSession}
                      onError={(err) => setError(err)}
                    />
                  </div>

                  <div className="my-5 flex items-center gap-3">
                    <div className="h-[1px] flex-1 bg-neutral-200 dark:bg-[#2C3A26]" />
                    <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      or continue with phone
                    </span>
                    <div className="h-[1px] flex-1 bg-neutral-200 dark:bg-[#2C3A26]" />
                  </div>

                  <form onSubmit={handleSendOtp} className="mt-2">
                    <div>
                      <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300 tracking-wider uppercase block" htmlFor="phone">
                        Phone Number
                      </label>
                      <div className="flex items-center bg-neutral-50 dark:bg-[#1E291B] border border-neutral-200 dark:border-[#2C3A26] rounded-xl px-4 py-3 mt-2 focus-within:border-[#2D5016] dark:focus-within:border-[#4B8324] focus-within:ring-1 focus-within:ring-[#2D5016] dark:focus-within:ring-[#4B8324] transition-all">
                        <span className="text-[15px] font-bold text-neutral-800 dark:text-neutral-200 tracking-tight">
                          +91
                        </span>
                        <div className="h-4 w-[1px] bg-neutral-300 dark:bg-[#2C3A26] mx-3" />
                        <input
                          id="phone"
                          type="tel"
                          placeholder="98450 12345"
                          className="bg-transparent border-0 outline-none p-0 text-[15px] font-bold text-neutral-900 dark:text-[#FAF7F0] w-full placeholder-neutral-400 dark:placeholder-neutral-500 focus:ring-0 focus:outline-none"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          required
                          autoFocus
                        />
                        {isPhoneValid && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="ml-2 text-[#3D6B1F] dark:text-[#68A33C]"
                          >
                            <CheckCircle2 className="h-5 w-5 fill-[#3D6B1F] dark:fill-[#68A33C] text-white" />
                          </motion.div>
                        )}
                      </div>
                    </div>

                    {isDevMode && (
                      <div className="mt-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-800 dark:text-amber-300">
                        Firebase credentials not detected in env{missingClientEnv.length > 0 ? ` (Missing: ${missingClientEnv.join(", ")})` : ""}. Running in prototype dev auth mode.
                      </div>
                    )}

                    {error && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-xs text-red-600 dark:text-red-400 font-semibold mt-3"
                      >
                        {error}
                      </motion.p>
                    )}
                  </form>
                </div>

                <div className="mt-8 pt-4 border-t border-neutral-200 dark:border-[#2C3A26]">
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 text-center font-medium leading-normal">
                    By continuing, you agree to O~Bele&apos;s{" "}
                    <span className="text-[#C85A32] dark:text-[#E07A5F] font-semibold hover:underline cursor-pointer">
                      Terms of Service
                    </span>{" "}
                    &{" "}
                    <span className="text-[#C85A32] dark:text-[#E07A5F] font-semibold hover:underline cursor-pointer">
                      Privacy Policy
                    </span>.
                  </p>

                  <Button
                    onClick={handleSendOtp}
                    className="w-full bg-[#143626] hover:bg-[#1E3A0F] dark:bg-[#2D5016] dark:hover:bg-[#3D6B1F] text-white font-bold h-14 rounded-xl flex items-center justify-center gap-2 mt-4 transition-all shadow-[0_4px_12px_rgba(20,54,38,0.2)] active:scale-[0.98] disabled:opacity-50"
                    disabled={loading || !isPhoneValid}
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
              </motion.div>
            ) : (
              <motion.div
                key="otp-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-2">
                    <button
                      type="button"
                      onClick={() => {
                        setStep("phone")
                        setError("")
                      }}
                      className="text-xs font-bold text-[#2D5016] dark:text-[#68A33C] hover:underline inline-flex items-center gap-1 focus:outline-none"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" /> Change Number
                    </button>
                  </div>

                  <OtpBoxedInput
                    length={6}
                    destination={`+91 ${formattedPhone}`}
                    label="Verify Phone Number"
                    hint={`Enter the 6-digit code sent to +91 ${formattedPhone}`}
                    error={!!error}
                    errorMessage={error || "Invalid verification code"}
                    resendCooldown={30}
                    value={otpCode}
                    onChange={setOtpCode}
                    onResend={() => handleSendOtp()}
                    onComplete={(code) => handleVerifyOtp(code)}
                    className="px-0 py-2"
                  />

                  {/* Dev Mode & Master OTP helper */}
                  {isDevMode && (
                    <div className="mt-3 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => {
                          setOtpCode("123456")
                          handleVerifyOtp("123456")
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm"
                      >
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Dev / Master Code: <strong className="font-mono tracking-wider">123456</strong></span>
                        <span className="text-[11px] font-normal underline ml-1">Tap to auto-fill</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-8 pt-4 border-t border-neutral-200 dark:border-[#2C3A26]">
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 text-center font-medium leading-normal">
                    By continuing, you agree to O~Bele&apos;s{" "}
                    <span className="text-[#C85A32] dark:text-[#E07A5F] font-semibold hover:underline cursor-pointer">
                      Terms of Service
                    </span>{" "}
                    &{" "}
                    <span className="text-[#C85A32] dark:text-[#E07A5F] font-semibold hover:underline cursor-pointer">
                      Privacy Policy
                    </span>.
                  </p>

                  <Button
                    onClick={() => handleVerifyOtp(otpCode)}
                    className="w-full bg-[#143626] hover:bg-[#1E3A0F] dark:bg-[#2D5016] dark:hover:bg-[#3D6B1F] text-white font-bold h-14 rounded-xl flex items-center justify-center gap-2 mt-4 transition-all shadow-[0_4px_12px_rgba(20,54,38,0.2)] active:scale-[0.98] disabled:opacity-50"
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── One-Time Phone Capture Modal for Google Sign-In ── */}
      <PhoneCompletionModal
        isOpen={showPhoneModal}
        onSuccess={() => {
          setShowPhoneModal(false)
          router.push(callbackUrl)
          router.refresh()
        }}
      />
    </div>
  )
}
