import { defineRouting } from "next-intl/routing"

export const routing = defineRouting({
  locales: ["en", "kn"],
  defaultLocale: "en",
  localePrefix: "never",
})
