import type { Metadata } from "next"
import { Fraunces, Figtree } from "next/font/google"

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["600", "700", "900"],
  variable: "--font-operator-display",
})

const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-operator-sans",
})

export const metadata: Metadata = {
  title: "Operator app | Payaswini O Bele",
}

export default function OperatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className={`${fraunces.variable} ${figtree.variable} font-[family-name:var(--font-operator-sans)]`}
    >
      {children}
    </div>
  )
}
