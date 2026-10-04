"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from "react"
import { getClientAuth } from "@/lib/firebase/client"
import { onAuthStateChanged, signOut as fbSignOut } from "firebase/auth"
import type { SessionUser } from "@/lib/auth-session"

export interface ClientSession {
  user: SessionUser
}

export interface SessionContextType {
  data: ClientSession | null
  status: "loading" | "authenticated" | "unauthenticated"
  signOut: (options?: { callbackUrl?: string; redirect?: boolean }) => Promise<void>
}

const SessionContext = createContext<SessionContextType>({
  data: null,
  status: "loading",
  signOut: async () => {},
})

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading")

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me")
      if (res.ok) {
        const json = await res.json()
        if (json.success && json.user) {
          setUser(json.user)
          setStatus("authenticated")
          return
        }
      }
      setUser(null)
      setStatus("unauthenticated")
    } catch {
      setUser(null)
      setStatus("unauthenticated")
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadInitialSession = async () => {
      try {
        const res = await fetch("/api/auth/me")
        if (!isMounted) return
        if (res.ok) {
          const json = await res.json()
          if (json.success && json.user) {
            setUser(json.user)
            setStatus("authenticated")
            return
          }
        }
        setUser(null)
        setStatus("unauthenticated")
      } catch {
        if (!isMounted) return
        setUser(null)
        setStatus("unauthenticated")
      }
    }

    void loadInitialSession()

    // Listen to Firebase client auth state changes if configured
    try {
      const auth = getClientAuth()
      if (auth) {
        const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
          if (!isMounted) return
          if (fbUser) {
            // Re-sync session with server
            await fetchSession()
          } else {
            // When client logs out of Firebase
            setUser(null)
            setStatus("unauthenticated")
          }
        })
        return () => {
          isMounted = false
          unsubscribe()
        }
      }
    } catch {
      // Firebase client not configured
    }

    return () => {
      isMounted = false
    }
  }, [fetchSession])

  const signOut = useCallback(
    async (options?: { callbackUrl?: string; redirect?: boolean }) => {
      try {
        // 1. Sign out of Firebase client if available
        const auth = getClientAuth()
        if (auth) {
          await fbSignOut(auth).catch(() => {})
        }

        // 2. Clear server session cookie
        await fetch("/api/auth/session", { method: "DELETE" }).catch(() => {})

        setUser(null)
        setStatus("unauthenticated")

        const callbackUrl = options?.callbackUrl || "/login"
        if (options?.redirect !== false && typeof window !== "undefined") {
          window.location.href = callbackUrl
        }
      } catch (err) {
        console.error("Failed to sign out cleanly:", err)
      }
    },
    []
  )

  const sessionData: ClientSession | null = user ? { user } : null

  return (
    <SessionContext.Provider value={{ data: sessionData, status, signOut }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  return useContext(SessionContext)
}

export function useAuth() {
  return useContext(SessionContext)
}

export async function signOut(options?: { callbackUrl?: string; redirect?: boolean }) {
  try {
    const auth = getClientAuth()
    if (auth) {
      await fbSignOut(auth).catch(() => {})
    }
    await fetch("/api/auth/session", { method: "DELETE" }).catch(() => {})
    const callbackUrl = options?.callbackUrl || "/login"
    if (options?.redirect !== false && typeof window !== "undefined") {
      window.location.href = callbackUrl
    }
  } catch (err) {
    console.error("Failed to sign out:", err)
  }
}

