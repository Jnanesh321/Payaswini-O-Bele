import type { Metadata, Viewport } from "next"
import { Lora, Nunito } from "next/font/google"
import { NextIntlClientProvider } from "next-intl"
import { getLocale, getMessages } from "next-intl/server"
import "./globals.css"
import { SessionProvider } from "@/components/providers/session-provider"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { SiteChrome } from "@/components/layout/site-chrome"
import { cn } from "@/lib/utils"

const nunito = Nunito({ subsets: ["latin"], variable: "--font-sans", display: "swap" })

const lora = Lora({ subsets: ["latin"], variable: "--font-heading", display: "swap" })

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF7F0" },
    { media: "(prefers-color-scheme: dark)", color: "#0F150D" },
  ],
}

export const metadata: Metadata = {
  title: {
    default: "Payaswini O Bele | Farm Tool Rentals",
    template: "%s | Payaswini O Bele",
  },
  description:
    "Rent farming tools at affordable prices in Dakshina Karnataka. Carbon fiber poles, sprayers, tillers and more — no upfront purchase needed.",
  keywords: [
    "farm tool rental",
    "carbon fiber poles",
    "areca harvesting tools",
    "Payaswini O Bele",
    "Dakshina Karnataka",
    "farming equipment rental",
  ],
  authors: [{ name: "Payaswini" }],
  creator: "Payaswini",
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "Payaswini O Bele",
    title: "Payaswini O Bele | Farm Tool Rentals",
    description:
      "Rent farming tools at affordable prices in Dakshina Karnataka.",
  },
  icons: {
    icon: "/favicon.ico",
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} className={cn(nunito.variable, lora.variable, "font-sans")} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased transition-colors duration-200">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false}>
          <SessionProvider>
            <NextIntlClientProvider locale={locale} messages={messages}>
              <SiteChrome>{children}</SiteChrome>
            </NextIntlClientProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
