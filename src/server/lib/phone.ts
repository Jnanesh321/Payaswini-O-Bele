// ─── Phone normalization & validation ─────────────────────────────────────────
// Standard Indian phone format: 10 digits starting with 6-9 (optionally with +91 or 91 prefix).
// Canonical format: 12-digit with "91" country code (e.g. "919845100001").

export function normalizePhone(rawPhone?: string): string | null {
  if (!rawPhone) return null
  const digits = rawPhone.replace(/\D/g, "")
  if (digits.length === 10) return `91${digits}`
  if (digits.length === 12 && digits.startsWith("91")) return digits
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`
  return null
}

export function isValidIndianPhone(phone?: string): boolean {
  if (!phone) return false
  const normalized = normalizePhone(phone)
  return normalized ? /^91[6-9]\d{9}$/.test(normalized) : false
}
