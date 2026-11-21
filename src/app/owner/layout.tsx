import type { Metadata } from "next"
import { Fraunces, Figtree } from "next/font/google"

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
})

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-owner-sans",
  display: "swap",
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
