"use client"

import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import Link from "next/link"
import { useOperatorBooking } from "../_components/use-operator-booking"

function OperatorReturnedInner() {
  const searchParams = useSearchParams()
  const bookingId = searchParams.get("booking")
  const { booking, loading, error } = useOperatorBooking(bookingId)

  return (
    <div className="min-h-screen bg-background px-0 sm:px-4 sm:py-6">
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col items-center justify-center gap-4 overflow-hidden bg-background px-6 py-24 text-center sm:min-h-[800px] sm:rounded-[32px] sm:border sm:border-border sm:shadow-xl">
        {loading ? (
          <div className="h-16 w-16 animate-pulse rounded-full border-2 border-border bg-muted" />
        ) : error ? (
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-border bg-muted text-3xl">!</div>
            <h1 className="font-display text-2xl font-bold text-foreground">Something went wrong</h1>
            <p className="max-w-xs text-sm text-muted-foreground">{error}</p>
          </div>
        ) : (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-accent bg-primary/10 text-3xl text-primary">✓</div>
            <h1 className="font-display text-2xl font-bold text-foreground">Tool returned</h1>
            {booking && (
              <p className="text-sm font-semibold text-muted-foreground">{booking.tool.name} · {booking.bookingRef}</p>
            )}
            <p className="max-w-xs text-sm text-muted-foreground">
              The tool is back with its owner. Your earnings for this job will be settled once the
              owner confirms the inspection.
            </p>
          </>
        )}
        <Link
          href="/operator"
          className="mt-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition hover:brightness-110"
        >
          Back to my jobs
        </Link>
      </div>
    </div>
  )
}

export default function OperatorReturnedPage() {
  return (
    <Suspense>
      <OperatorReturnedInner />
    </Suspense>
  )
}