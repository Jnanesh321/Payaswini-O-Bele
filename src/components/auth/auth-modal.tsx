"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, CheckCircle2, Loader2, ArrowRight, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui"
import { AppLogo } from "@/components/ui/app-logo"
import { GoogleSignInButton } from "./google-sign-in-button"
import { PhoneCompletionModal } from "./phone-completion-modal"
import { OtpBoxedInput } from "@/components/otp/otp-boxed-input"
import { getClientAuth, isFirebaseConfigured } from "@/lib/firebase/client"
import { isNativePlatform } from "@/lib/platform"
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth"

export interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  callbackUrl?: string
}

export function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  callbackUrl = "/",
}: AuthModalProps) {
  const [step, setStep] = useState<"phone" | "otp">("phone")
  const [phone, setPhone] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPhoneModal, setShowPhoneModal] = useState(false)
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)
  const [nativeVerificationId, setNativeVerificationId] = useState<string | null>(null)
  const isDevMode = !isFirebaseConfigured()

  const cleanPhone = phone.replace(/\D/g, "")
  const isPhoneValid = cleanPhone.length === 10
  const formattedPhone = cleanPhone.length === 10
    ? `${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}`
    : cleanPhone

  const completeSession = async (idToken: string) => {
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || "Authentication failed on server")
    }

    if (data.user?.needsPhone) {
      setShowPhoneModal(true)
      return
    }

    onClose()
    if (onSuccess) onSuccess()
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
      let idToken: string

      if (isNativePlatform() && nativeVerificationId) {
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
        const credential = await confirmationResult.confirm(finalOtp)
        idToken = await credential.user.getIdToken()
      } else if (isDevMode) {
        idToken = `mock_firebase_${cleanPhone}`
      } else {
        throw new Error("Authentication session expired. Please request a new code.")
      }

      await completeSession(idToken)
    } catch (err: unknown) {
      console.error("OTP verification error:", err)
      setError(err instanceof Error ? err.message : "Verification failed. Please check the code.")
    } finally {
      setLoading(false)
    }
  }

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
            console.error("Native instant verification error:", err)
            setError("Failed to establish session after instant verification")
          } finally {
            setLoading(false)
          }
        })

        await FirebaseAuthentication.addListener("phoneVerificationFailed", (event) => {
          setError(event.message || "Phone verification failed")
          setLoading(false)
        })

        await FirebaseAuthentication.signInWithPhoneNumber({ phoneNumber: `+91${cleanPhone}` })
        return
      }

      if (isFirebaseConfigured()) {
        const auth = getClientAuth()
        if (!auth) throw new Error("Firebase Auth client could not be initialized")

        const recaptchaVerifier = new RecaptchaVerifier(auth, "modal-recaptcha-container", {
          size: "invisible",
        })

        const confirmation = await signInWithPhoneNumber(
          auth,
          `+91${cleanPhone}`,
          recaptchaVerifier
        )
        setConfirmationResult(confirmation)
      }

      setStep("otp")
    } catch (err: unknown) {
      console.error("Firebase Phone Auth error:", err)
      setError(err instanceof Error ? err.message : "Failed to send verification SMS")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs p-0 sm:items-center sm:p-4">
          <div id="modal-recaptcha-container" />

          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ y: "100%", opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="relative z-10 flex w-full max-w-[420px] flex-col rounded-t-3xl sm:rounded-2xl border border-neutral-200 dark:border-[#2C3A26] bg-white dark:bg-[#172014] p-6 shadow-2xl overflow-hidden pb-safe text-neutral-900 dark:text-[#FAF7F0] transition-colors"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3">
              <AppLogo width={110} height={36} className="h-8 w-auto" priority />
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1.5 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[#253322] transition"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <AnimatePresence mode="wait">
              {step === "phone" ? (
                <motion.div
                  key="modal-phone-step"
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 15 }}
                  transition={{ duration: 0.2 }}
                >
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-[#FAF7F0] font-heading tracking-tight leading-snug">
                    Sign in to Payaswini O~Bele
                  </h3>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 font-sans mt-1 leading-relaxed">
                    Fast, secure login for farmers and machinery owners.
                  </p>

                  {/* Google Sign-In Prominently */}
                  <div className="mt-4">
                    <GoogleSignInButton
                      onSuccess={completeSession}
                      onError={(err) => setError(err)}
                    />
                  </div>

                  <div className="my-4 flex items-center gap-3">
                    <div className="h-[1px] flex-1 bg-neutral-200 dark:bg-[#2C3A26]" />
                    <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      or continue with phone
                    </span>
                    <div className="h-[1px] flex-1 bg-neutral-200 dark:bg-[#2C3A26]" />
                  </div>

                  <form onSubmit={handleSendOtp} className="space-y-3">
                    <div>
                      <label
                        htmlFor="modal-phone"
                        className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300 tracking-wider uppercase block"
                      >
                        Phone Number
                      </label>
                      <div className="flex items-center bg-neutral-50 dark:bg-[#1E291B] border border-neutral-200 dark:border-[#2C3A26] rounded-xl px-4 py-3 mt-1.5 focus-within:border-[#2D5016] dark:focus-within:border-[#4B8324] focus-within:ring-1 focus-within:ring-[#2D5016] dark:focus-within:ring-[#4B8324] transition-all">
                        <span className="text-[15px] font-bold text-neutral-800 dark:text-neutral-200 tracking-tight">
                          +91
                        </span>
                        <div className="h-4 w-[1px] bg-neutral-300 dark:bg-[#2C3A26] mx-3" />
                        <input
                          id="modal-phone"
                          type="tel"
                          placeholder="98450 12345"
                          className="bg-transparent border-0 outline-none p-0 text-[15px] font-bold text-neutral-900 dark:text-[#FAF7F0] w-full placeholder-neutral-400 dark:placeholder-neutral-500 focus:ring-0 focus:outline-none"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          required
                          autoFocus
                        />
                        {isPhoneValid && (
                          <div className="ml-2 text-[#3D6B1F] dark:text-[#68A33C]">
                            <CheckCircle2 className="h-5 w-5 fill-[#3D6B1F] dark:fill-[#68A33C] text-white" />
                          </div>
                        )}
                      </div>
                    </div>

                    {error && (
                      <p className="text-xs text-red-600 dark:text-red-400 font-semibold">{error}</p>
                    )}

                    <Button
                      type="submit"
                      disabled={loading || !isPhoneValid}
                      className="w-full bg-[#143626] hover:bg-[#1E3A0F] dark:bg-[#2D5016] dark:hover:bg-[#3D6B1F] text-white font-bold h-12 rounded-xl flex items-center justify-center gap-2 mt-2 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      {loading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-white" />
                      ) : (
                        <>
                          <span>Verify & Continue</span>
                          <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                        </>
                      )}
                    </Button>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="modal-otp-step"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center justify-between pb-2">
                    <button
                      type="button"
                      onClick={() => {
                        setStep("phone")
                        setError("")
                      }}
                      className="text-xs font-bold text-[#2D5016] dark:text-[#68A33C] hover:underline inline-flex items-center gap-1"
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

                  {isDevMode && (
                    <div className="mt-2 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setOtpCode("123456")
                          handleVerifyOtp("123456")
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 transition"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Dev Master Code: <strong>123456</strong></span>
                      </button>
                    </div>
                  )}

                  <Button
                    onClick={() => handleVerifyOtp(otpCode)}
                    disabled={otpCode.length !== 6 || loading}
                    className="w-full bg-[#143626] hover:bg-[#1E3A0F] dark:bg-[#2D5016] dark:hover:bg-[#3D6B1F] text-white font-bold h-12 rounded-xl flex items-center justify-center gap-2 mt-4 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                    ) : (
                      <>
                        <span>Verify & Continue</span>
                        <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                      </>
                    )}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Phone Completion modal if Google user has no phone */}
          <PhoneCompletionModal
            isOpen={showPhoneModal}
            onSuccess={() => {
              setShowPhoneModal(false)
              onClose()
              if (onSuccess) onSuccess()
            }}
          />
        </div>
      )}
    </AnimatePresence>
  )
}
