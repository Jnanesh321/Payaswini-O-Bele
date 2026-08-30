export interface RegionConfig {
  code: string
  name: string
  state: string
  defaultLocale: "en" | "kn"
  supportedLocales: ("en" | "kn")[]
  currency: {
    code: string
    symbol: string
    name: string
  }
  localeFormatMap: Record<string, { locale: string; currency: string }>
}

export const REGION_CONFIG: RegionConfig = {
  code: "KA_DK_KL_KSD",
  name: "Payaswini (Dakshina Kannada & Kasaragod)",
  state: "Karnataka & Kerala Border",
  defaultLocale: "en",
  supportedLocales: ["en", "kn"],
  currency: {
    code: "INR",
    symbol: "₹",
    name: "Indian Rupee",
  },
  localeFormatMap: {
    en: { locale: "en-IN", currency: "INR" },
    kn: { locale: "kn-IN", currency: "INR" },
  },
}

/**
 * Format monetary amount (in paise or standard integer) based on region & locale.
 * @param amountInPaise Amount in paise (1 INR = 100 paise)
 * @param locale Current active locale ('en' | 'kn')
 */
export function formatRegionalPrice(amountInPaise: number, locale = "en"): string {
  const fmt = REGION_CONFIG.localeFormatMap[locale] ?? REGION_CONFIG.localeFormatMap[REGION_CONFIG.defaultLocale]
  return new Intl.NumberFormat(fmt.locale, {
    style: "currency",
    currency: fmt.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountInPaise / 100)
}
