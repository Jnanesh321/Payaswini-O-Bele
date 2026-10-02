"use client"

import { forwardRef, useEffect, useState, type ComponentPropsWithoutRef } from "react"
import { cn } from "@/lib/utils"
import { Package, X, CheckCircle2, ChevronRight } from "lucide-react"

const EXIT_MS = 260

export type DeliveryNotificationBannerProps = Readonly<
  {
    status?: string
    eta?: string
    orderId?: string
    toolName?: string
    showTriggerLabel?: string
    onDismiss?: () => void
    onShow?: () => void
    onClick?: () => void
  } & ComponentPropsWithoutRef<"output">
>

// OpenSource UI (https://opensourceui.in/components/delivery-notification)
// Delivery update — compact row, package icon, status + ETA in floating glass pill.
export const DeliveryNotificationBanner = forwardRef<
  HTMLOutputElement,
  DeliveryNotificationBannerProps
>(
  (
    {
      className,
      status = "Out for delivery",
      eta = "Arriving today by 6:15 PM",
      orderId = "#4821",
      toolName,
      showTriggerLabel = "Show dispatch update",
      onDismiss,
      onShow,
      onClick,
      ...props
    },
    ref
  ) => {
    const [phase, setPhase] = useState<"open" | "closing" | "closed">("open")

    useEffect(() => {
      if (phase !== "closing") return
      const timer = globalThis.setTimeout(() => setPhase("closed"), EXIT_MS)
      return () => globalThis.clearTimeout(timer)
    }, [phase])

    const handleDismiss = (e: React.MouseEvent) => {
      e.stopPropagation()
      if (phase !== "open") return
      setPhase("closing")
      onDismiss?.()
    }

    const handleShow = () => {
      setPhase("open")
      onShow?.()
    }

    if (phase === "closed") {
      return (
        <button
          type="button"
          onClick={handleShow}
          className={cn(
            "cursor-pointer rounded-xl bg-card/90 border border-border px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted transition-all active:scale-95",
            className
          )}
        >
          ⚡ {showTriggerLabel}
        </button>
      )
    }

    return (
      <output
        ref={ref}
        data-slot="delivery-notification-banner"
        data-phase={phase}
        onClick={onClick}
        className={cn(
          "relative flex w-full items-start gap-3 rounded-2xl border border-primary/20 bg-card/95 p-3.5 pr-8 font-sans backdrop-blur-xl shadow-md cursor-pointer select-none",
          "translate-y-0 opacity-100 starting:-translate-y-2.5 starting:opacity-0",
          "transition-all duration-300 ease-out",
          "data-[phase=closing]:-translate-y-2 data-[phase=closing]:opacity-0",
          className
        )}
        {...props}
      >
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss notification"
          className="absolute top-2.5 right-2.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X size={12} />
        </button>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Package size={20} strokeWidth={2} aria-hidden />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-[13px] font-bold text-foreground leading-tight">{status}</p>
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          {toolName && (
            <p className="text-xs font-semibold text-primary mt-0.5">{toolName}</p>
          )}
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{eta}</p>
          <p className="mt-1 text-[10px] font-mono text-muted-foreground/80">
            Booking {orderId}
          </p>
        </div>

        <div className="flex items-center self-center text-muted-foreground">
          <ChevronRight size={16} />
        </div>
      </output>
    )
  }
)

DeliveryNotificationBanner.displayName = "DeliveryNotificationBanner"
