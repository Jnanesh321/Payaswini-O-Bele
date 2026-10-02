"use client"

import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
} from "react"
import { cn } from "@/lib/utils"
import { Check, Loader2, ShoppingBag, Zap } from "lucide-react"

type Phase = "idle" | "loading" | "added"

export type AddToCartButtonProps = Readonly<
  {
    label?: string
    loadingLabel?: string
    addedLabel?: string
    loadingMs?: number
    resetMs?: number
  } & ComponentPropsWithoutRef<"button">
>

const ICON_LAYER =
  "absolute inset-0 grid place-items-center transition-opacity ease-out motion-reduce:transition-none"

const LABEL_LAYER =
  "col-start-1 row-start-1 text-center transition-opacity ease-out motion-reduce:transition-none"

// OpenSource UI (https://opensourceui.in/components/add-to-cart-button)
// Raised 3D key that sinks in while adding, with gentle label crossfades, then pops back up in a solid emerald added state.
export const AddToCartButton = forwardRef<HTMLButtonElement, AddToCartButtonProps>(
  (
    {
      className,
      label = "Book Now",
      loadingLabel = "Booking...",
      addedLabel = "Confirmed",
      loadingMs = 900,
      resetMs = 1500,
      onClick,
      ...props
    },
    ref
  ) => {
    const [phase, setPhase] = useState<Phase>("idle")
    const timers = useRef<ReturnType<typeof setTimeout>[]>([])

    useEffect(() => {
      const timeoutIds = timers
      return () => {
        timeoutIds.current.forEach((id) => globalThis.clearTimeout(id))
      }
    }, [])

    const idle = phase === "idle"
    const loading = phase === "loading"
    const added = phase === "added"

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event)
      if (!idle) return
      setPhase("loading")
      timers.current.push(
        globalThis.setTimeout(() => setPhase("added"), loadingMs),
        globalThis.setTimeout(() => setPhase("idle"), loadingMs + resetMs)
      )
    }

    return (
      <button
        ref={ref}
        type="button"
        data-slot="add-to-cart-button"
        data-phase={phase}
        aria-busy={loading || undefined}
        aria-disabled={!idle || undefined}
        onClick={handleClick}
        className={cn(
          "relative inline-flex h-10 min-w-32 items-center justify-center gap-2 rounded-xl px-4 font-sans text-xs font-bold outline-none select-none transition-all duration-200 cursor-pointer",
          // Raised primary key
          idle &&
            "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 active:scale-95",
          // Loading: sunken
          loading && "cursor-default bg-primary/80 text-primary-foreground opacity-90",
          // Added: emerald state
          added && "cursor-default bg-emerald-600 text-white shadow-xs",
          className
        )}
        {...props}
      >
        <span className="sr-only" aria-live="polite">
          {loading ? loadingLabel : added ? addedLabel : ""}
        </span>

        {/* Fixed icon slot */}
        <span className="relative size-3.5 shrink-0">
          <span
            aria-hidden
            className={cn(
              ICON_LAYER,
              idle ? "opacity-100 delay-150 duration-200" : "opacity-0 duration-150"
            )}
          >
            <Zap size={14} className="fill-current" />
          </span>
          <span
            aria-hidden
            className={cn(
              ICON_LAYER,
              loading ? "opacity-100 delay-150 duration-200" : "opacity-0 duration-150"
            )}
          >
            <Loader2 size={14} className="animate-spin" />
          </span>
          <span
            aria-hidden
            className={cn(
              ICON_LAYER,
              added ? "opacity-100 delay-150 duration-200" : "opacity-0 duration-150"
            )}
          >
            <Check size={14} strokeWidth={2.5} />
          </span>
        </span>

        <span className="grid">
          <span
            aria-hidden={!idle}
            className={cn(
              LABEL_LAYER,
              idle ? "opacity-100 delay-150 duration-200" : "opacity-0 duration-150"
            )}
          >
            {label}
          </span>
          <span
            aria-hidden={!loading}
            className={cn(
              LABEL_LAYER,
              loading ? "opacity-100 delay-150 duration-200" : "opacity-0 duration-150"
            )}
          >
            {loadingLabel}
          </span>
          <span
            aria-hidden={!added}
            className={cn(
              LABEL_LAYER,
              added ? "opacity-100 delay-150 duration-200" : "opacity-0 duration-150"
            )}
          >
            {addedLabel}
          </span>
        </span>
      </button>
    )
  }
)

AddToCartButton.displayName = "AddToCartButton"
