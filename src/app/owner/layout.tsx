import type { Metadata } from "next"
import { Fraunces, Figtree } from "next/font/google"

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["600", "700", "900"],
  variable: "--font-owner-display",
})

const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-owner-sans",
})

export const metadata: Metadata = {
  title: "Tool Owner app | Payaswini O Bele",
}

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className={`${fraunces.variable} ${figtree.variable} font-[family-name:var(--font-owner-sans)]`}
    >
      {children}
    </div>
  )
}
