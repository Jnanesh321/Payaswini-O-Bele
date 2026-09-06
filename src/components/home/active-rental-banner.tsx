"use client"

import Link from "next/link"
import { Tractor, ArrowRight, Clock, ShieldCheck, MapPin, CheckCircle2 } from "lucide-react"

export interface ActiveBookingData {
  id: string
  bookingRef?: string
  status: string
  toolName: string
  operatorName?: string | null
  startDate: string | Date
  endDate: string | Date
  serviceType: string
}

interface ActiveRentalBannerProps {
  booking: ActiveBookingData | null
  locale?: string
}

function getStatusDisplay(status: string, locale: string) {
  switch (status) {
    case "REQUESTED":
    case "OWNER_PENDING":
      return {
        badge: locale === "kn" ? "ಅನುಮೋದನೆ ಬಾಕಿ" : "Awaiting Confirmation",
        color: "bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30",
        dot: "bg-amber-500",
        headline: locale === "kn" ? "ಮಾಲೀಕರ ಅನುಮೋದನೆ ನಿರೀಕ್ಷಿಸಲಾಗುತ್ತಿದೆ" : "Owner Review in Progress",
      }
    case "OWNER_ACCEPTED":
    case "OPERATOR_PENDING":
      return {
        badge: locale === "kn" ? "ಆಪರೇಟರ್ ನಿಯೋಜನೆ" : "Assigning Operator",
        color: "bg-blue-500/20 text-blue-800 dark:text-blue-300 border-blue-500/30",
        dot: "bg-blue-500",
        headline: locale === "kn" ? "ತರಬೇತಿ ಹೊಂದಿದ ಆಪರೇಟರ್ ನಿಯೋಜಿಸಲಾಗುತ್ತಿದೆ" : "Matching Certified Operator",
      }
    case "OPERATOR_ASSIGNED":
    case "OPERATOR_ACCEPTED":
      return {
        badge: locale === "kn" ? "ಆಪರೇಟರ್ ಸಿದ್ಧ" : "Operator Assigned",
        color: "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/30",
        dot: "bg-emerald-500",
        headline: locale === "kn" ? "ಆಪರೇಟರ್ ಉಪಕರಣ ಪಡೆಯಲು ಸಿದ್ಧರಾಗಿದ್ದಾರೆ" : "Ready for Equipment Pickup",
      }
    case "FETCHING_TOOL":
    case "TOOL_COLLECTED":
      return {
        badge: locale === "kn" ? "ಉಪಕರಣ ಸಂಗ್ರಹಿಸಲಾಗಿದೆ" : "Tool Collected",
        color: "bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border-indigo-500/30",
        dot: "bg-indigo-500",
        headline: locale === "kn" ? "ಉಪಕರಣ ಸಂಗ್ರಹಿಸಲಾಗಿದೆ — ನಿಮ್ಮ ಜಮೀನಿಗೆ ಸಾಗಿಸಲಾಗುತ್ತಿದೆ" : "Equipment Collected — In Transit",
      }
    case "TRAVELLING_TO_FARM":
      return {
        badge: locale === "kn" ? "ಆಪರೇಟರ್ ಮಾರ್ಗದಲ್ಲಿದ್ದಾರೆ" : "Operator En Route",
        color: "bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30",
        dot: "bg-amber-500 animate-pulse",
        headline: locale === "kn" ? "ಆಪರೇಟರ್ ನಿಮ್ಮ ಜಮೀನಿಗೆ ಪ್ರಯಾಣಿಸುತ್ತಿದ್ದಾರೆ" : "Operator Travelling to Your Farm",
      }
    case "ARRIVED":
    case "WORK_STARTED":
    case "WORK_RESUMED":
      return {
        badge: locale === "kn" ? "ಕೆಲಸ ಪ್ರಗತಿಯಲ್ಲಿದೆ" : "Work in Progress",
        color: "bg-emerald-600/20 text-emerald-800 dark:text-emerald-300 border-emerald-600/30",
        dot: "bg-emerald-600 animate-ping",
        headline: locale === "kn" ? "ಕೃಷಿ ಕೆಲಸ ನಡೆಯುತ್ತಿದೆ" : "Field Work in Progress",
      }
    case "WORK_COMPLETED":
    case "RETURNING_TOOL":
    case "TOOL_RETURNED":
    case "INSPECTION":
      return {
        badge: locale === "kn" ? "ಪರಿಶೀಲನೆ ಹಂತ" : "Inspection & Return",
        color: "bg-teal-500/20 text-teal-800 dark:text-teal-300 border-teal-500/30",
        dot: "bg-teal-500",
        headline: locale === "kn" ? "ಉಪಕರಣ ಮರಳಿಸಲಾಗಿದೆ — ಠೇವಣಿ ಮರುಪಾವತಿ ಪ್ರಕ್ರಿಯೆ" : "Tool Returned — Deposit Processing",
      }
    default:
      return {
        badge: locale === "kn" ? "ಸಕ್ರಿಯ ಬಾಡಿಗೆ" : "Active Rental",
        color: "bg-primary/20 text-primary border-primary/30",
        dot: "bg-primary",
        headline: locale === "kn" ? "ಚಾಲ್ತಿಯಲ್ಲಿರುವ ಬಾಡಿಗೆ ಸೇವೆ" : "Ongoing Rental Service",
      }
  }
}

export function ActiveRentalBanner({ booking, locale = "en" }: ActiveRentalBannerProps) {
  if (!booking) return null

  const display = getStatusDisplay(booking.status, locale)

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#D4A017]/40 bg-gradient-to-br from-[#FAF7F0] via-[#F3EDE0] to-[#EAE0D0] dark:from-[#1E2B1A] dark:to-[#162013] p-3.5 shadow-sm transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2D5016] text-[#FAF7F0] shadow-xs">
            <Tractor size={18} />
          </div>

          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${display.color}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${display.dot}`} />
                {display.badge}
              </span>

              {booking.operatorName && (
                <span className="text-[10.5px] font-medium text-muted-foreground">
                  • {booking.operatorName}
                </span>
              )}
            </div>

            <h4 className="mt-1 font-display text-xs font-bold text-foreground leading-snug">
              {booking.toolName}
            </h4>

            <p className="text-[11px] text-muted-foreground leading-tight">
              {display.headline}
            </p>
          </div>
        </div>

        <Link
          href={`/dashboard`}
          className="shrink-0 inline-flex items-center gap-1 rounded-xl bg-[#2D5016] hover:bg-[#1E360F] text-white px-2.5 py-1.5 text-xs font-bold shadow-xs transition hover:brightness-105"
        >
          <span>{locale === "kn" ? "ವೀಕ್ಷಿಸಿ" : "View"}</span>
          <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  )
}
