"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function VerifyOTPPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const phone = searchParams.get("phone") || ""
  const callbackUrl = searchParams.get("callbackUrl") || "/"

  useEffect(() => {
    // Redirect to the unified Firebase phone authentication flow on /login
    const params = new URLSearchParams()
    if (phone) params.set("phone", phone)
    if (callbackUrl) params.set("callbackUrl", callbackUrl)
    router.replace(`/login?${params.toString()}`)
  }, [phone, callbackUrl, router])

  return (
    <div className="min-h-screen bg-background dark:bg-[#121512] flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">Redirecting to login...</p>
      </div>
    </div>
  )
}
