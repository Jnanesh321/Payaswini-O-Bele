import { getRequestConfig } from "next-intl/server"
import { headers } from "next/headers"
import { routing } from "./routing"

export default getRequestConfig(async () => {
  const headersList = await headers()
  const localeHeader = headersList.get("X-NEXT-INTL-LOCALE")
  const locale = routing.locales.includes(localeHeader as "en" | "kn")
    ? (localeHeader as "en" | "kn")
    : routing.defaultLocale

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  }
})
