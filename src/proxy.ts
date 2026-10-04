import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"
import Negotiator from "negotiator"
import { match } from "@formatjs/intl-localematcher"

const locales = ["en", "kn"]
const defaultLocale = "en"

function getLocale(request: NextRequest): string {
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value
  if (cookieLocale && locales.includes(cookieLocale)) return cookieLocale

  const languages = new Negotiator({
    headers: { "accept-language": request.headers.get("accept-language") || undefined },
  }).languages()

  try {
    const matched = match(languages, locales, defaultLocale)
    const found = locales.find((l) => l.toLowerCase() === matched.toLowerCase())
    if (found) return found
  } catch {}

  return defaultLocale
}

import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth-session"

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const search = request.nextUrl.search || ""
  const fullPath = pathname + search
  const locale = getLocale(request)

  let sessionUser: { id: string; isAdmin: boolean; capabilities: string[] } | null = null

  // 1. Check primary O~Bele session cookie (from Firebase authentication)
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value
  if (sessionCookie) {
    const verified = await verifySessionToken(sessionCookie)
    if (verified) {
      sessionUser = {
        id: verified.id,
        isAdmin: verified.isAdmin,
        capabilities: verified.capabilities,
      }
    }
  }

  // 2. Fallback to legacy NextAuth JWT token if available
  if (!sessionUser) {
    try {
      const token = await getToken({ req: request })
      if (token) {
        sessionUser = {
          id: (token.id as string) || (token.sub as string),
          isAdmin: Boolean(token.isAdmin),
          capabilities: (token.capabilities as string[] | undefined) || [],
        }
      }
    } catch {}
  }

  const capabilities = sessionUser?.capabilities || []
  const isAuthenticated = Boolean(sessionUser)

  // Admin routes
  if (pathname.startsWith("/admin")) {
    if (!sessionUser || !sessionUser.isAdmin) {
      return NextResponse.redirect(new URL("/", request.url))
    }
  }

  // Tool Owner routes
  if (pathname.startsWith("/owner")) {
    if (!sessionUser) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("callbackUrl", fullPath)
      return NextResponse.redirect(loginUrl)
    }
    const isOwner = sessionUser.isAdmin || capabilities.includes("TOOL_OWNER")
    if (!isOwner) {
      const onboardUrl = new URL("/onboarding", request.url)
      onboardUrl.searchParams.set("callbackUrl", fullPath)
      return NextResponse.redirect(onboardUrl)
    }
  }

  // Operator routes
  if (pathname.startsWith("/operator")) {
    if (!sessionUser) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("callbackUrl", fullPath)
      return NextResponse.redirect(loginUrl)
    }
    const isOperator = sessionUser.isAdmin || capabilities.includes("OPERATOR")
    if (!isOperator) {
      const onboardUrl = new URL("/onboarding", request.url)
      onboardUrl.searchParams.set("callbackUrl", fullPath)
      return NextResponse.redirect(onboardUrl)
    }
  }

  // Onboarding route (requires authentication)
  if (pathname.startsWith("/onboarding")) {
    if (!sessionUser) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("callbackUrl", fullPath)
      return NextResponse.redirect(loginUrl)
    }
  }

  // General customer protected routes
  const protectedPaths = ["/dashboard", "/checkout", "/orders"]
  if (protectedPaths.some((p) => pathname.startsWith(p))) {
    if (!sessionUser) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("callbackUrl", fullPath)
      return NextResponse.redirect(loginUrl)
    }
  }

  const headers = new Headers(request.headers)
  headers.set("X-NEXT-INTL-LOCALE", locale)

  const response = NextResponse.next({ request: { headers } })
  response.cookies.set("NEXT_LOCALE", locale, {
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
    sameSite: "lax",
  })

  return response
}

export { proxy as middleware }

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|logos|images|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|webm)$).*)"],
}

