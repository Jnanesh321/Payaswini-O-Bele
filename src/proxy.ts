import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"
import Negotiator from "negotiator"
import { match } from "@formatjs/intl-localematcher"

const locales = ["en", "kn"]
const defaultLocale = "kn"

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

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const token = await getToken({ req: request })
  const locale = getLocale(request)

  const adminPaths = ["/admin"]
  if (adminPaths.some((p) => pathname.startsWith(p))) {
    if (!token || token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", request.url))
    }
  }

  const protectedPaths = ["/dashboard", "/checkout", "/orders"]
  if (protectedPaths.some((p) => pathname.startsWith(p))) {
    if (!token) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("callbackUrl", pathname)
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

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|logos).*)"],
}
