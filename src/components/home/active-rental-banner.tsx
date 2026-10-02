"use client"

import { useRouter } from "next/navigation"
import { DeliveryNotificationBanner } from "@/components/notifications/delivery-notification-banner"

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
  const router = useRouter()
  if (!booking) return null

  const display = getStatusDisplay(booking.status, locale)

  return (
    <div className="w-full">
      <DeliveryNotificationBanner
        status={display.badge}
        eta={display.headline}
        toolName={booking.toolName}
        orderId={booking.bookingRef || `#${booking.id.slice(-6)}`}
        showTriggerLabel={locale === "kn" ? "ಸಕ್ರಿಯ ಬಾಡಿಗೆ ವಿವರ" : "View Live Dispatch"}
        onClick={() => router.push(`/orders/${booking.id}`)}
      />
    </div>
  )
}
