"use client"

import { useCallback, useMemo, useState } from "react"

export interface OperatorBooking {
  id: string
  bookingRef: string
  status: string
  serviceType: string
  startDate: string
  endDate: string
  totalDays: number
  operatorFeePerDay: number
  totalOperatorFee: number
  toolFeePerDay: number
  totalToolFee: number
  totalAmount: number
  deposit: number
  tool: { name: string; images: string[] }
  farmer: { id: string; name: string; phone: string }
  toolOwner: {
    id: string
    name: string
    phone: string
    village?: string | null
    taluk?: string | null
    district?: string | null
    pincode?: string | null
  }
  deliveryAddress?: string | null
  deliveryDistrict?: string | null
  deliveryTaluk?: string | null
  deliveryPincode?: string | null
  toolInstance?: {
    id: string
    assetCode: string
    status: string
    currentCustodianId?: string | null
    notes?: string | null
  } | null
  handoverLogs?: {
    id: string
    handoverType: string
    conditionGrade: string
    notes?: string | null
    createdAt: string
  }[]
  stateLogs: { fromState: string; toState: string; note: string | null; createdAt: string }[]
  /** Legal next states for THIS booking, returned by the server (§9 state machine). */
  permittedTargets: string[]
}

export interface TransitionResult {
  booking?: OperatorBooking
  log?: { toState: string }
  error?: string
}

/** Map an operator-facing booking status to the screen that owns it. */
export function statusToRoute(status: string): string | null {
  switch (status) {
    case "OPERATOR_ACCEPTED":
    case "FETCHING_TOOL":
      return "pickup"
    case "TOOL_COLLECTED":
    case "TRAVELLING_TO_FARM":
      return "en-route"
    case "ARRIVED":
      return "arrived"
    case "WORK_STARTED":
    case "WORK_PAUSED":
    case "WORK_RESUMED":
      return "work"
    case "WORK_COMPLETED":
    case "RETURNING_TOOL":
      return "return"
    case "TOOL_RETURNED":
    case "INSPECTION":
    case "COMPLETED":
      return "returned"
    default:
      return "operator"
  }
}

export function useOperatorBooking(bookingId: string | null) {
  const [booking, setBooking] = useState<OperatorBooking | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!bookingId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/rentals/${bookingId}/transition`, { cache: "no-store" })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || "Failed to load job")
      } else {
        setBooking(json.data)
      }
    } catch {
      setError("Failed to load job")
    } finally {
      setLoading(false)
    }
  }, [bookingId])

  const transition = useCallback(
    async (to: string, note?: string): Promise<TransitionResult> => {
      if (!bookingId) return { error: "No job selected" }
      setError(null)
      try {
        const res = await fetch(`/api/rentals/${bookingId}/transition`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to, ...(note ? { note } : {}) }),
        })
        const json = await res.json()
        if (!res.ok) {
          setError(json.error || "Transition failed")
          return { error: json.error || "Transition failed" }
        }
        await refresh()
        return json.data
      } catch {
        setError("Network error — try again")
        return { error: "Network error — try again" }
      }
    },
    [bookingId, refresh],
  )

  /** Run N sequential transitions (e.g., TOOL_COLLECTED then TRAVELLING_TO_FARM). */
  const transitionChain = useCallback(
    async (targets: string[], note?: string): Promise<TransitionResult[]> =>
      {
        const results: TransitionResult[] = []
        for (const to of targets) {
          const r = await transition(to, note)
          results.push(r)
          if (r.error) break
        }
        return results
      },
    [transition],
  )

  const memo = useMemo(
    () => ({
      booking,
      loading,
      error,
      refresh,
      transition,
      transitionChain,
      can: (to: string) => (booking?.permittedTargets ?? []).includes(to),
    }),
    [booking, loading, error, refresh, transition, transitionChain],
  )
  return memo
}