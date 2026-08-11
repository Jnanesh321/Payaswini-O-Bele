const MSG91_ENDPOINT = "https://control.msg91.com/api/v5/otp"
const MSG91_COUNTRY_CODE = "91"

function toMsg91Mobile(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 10) return `${MSG91_COUNTRY_CODE}${digits}`
  return digits
}

interface SendSmsResult {
  sent: boolean
  channel: "msg91" | "log"
  message: string
}

interface SendOtpResult {
  sent: boolean
  message: string
}

function smsLiveDeliveryEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return true
  return process.env.SMS_ENABLED === "true"
}

export async function sendOtpSms(phone: string, otp: string): Promise<SendOtpResult> {
  const authKey = process.env.MSG91_AUTH_KEY
  const templateId = process.env.MSG91_OTP_TEMPLATE_ID

  if (!smsLiveDeliveryEnabled() || !authKey || !templateId) {
    return { sent: false, message: "SMS live delivery disabled or not configured (MSG91_AUTH_KEY / MSG91_OTP_TEMPLATE_ID)" }
  }

  const url = new URL(MSG91_ENDPOINT)
  url.searchParams.set("authkey", authKey)
  url.searchParams.set("template_id", templateId)
  url.searchParams.set("mobile", toMsg91Mobile(phone))
  url.searchParams.set("otp", otp)
  url.searchParams.set("otp_expiry", "5")
  url.searchParams.set("otp_length", otp.length.toString())

  try {
    const res = await fetch(url.toString(), { method: "GET" })
    const data = await res.json().catch(() => null)
    const sent = res.ok && data?.type === "success"
    return {
      sent,
      message: data?.message ?? `MSG91 responded with HTTP ${res.status}`,
    }
  } catch (error) {
    return {
      sent: false,
      message: error instanceof Error ? error.message : "MSG91 send failed",
    }
  }
}

/**
 * Transactional SMS notification for booking lifecycle events (e.g. "no
 * operator available — refund initiated"). Uses the same delivery guard as
 * OTP. In dev / when MSG91 is not configured this only logs the message so
 * the farmer notification is never silently dropped.
 *
 * NOTE: MSG91 live delivery for transactional (non-OTP) messages is not yet
 * wired to a template — this returns `channel: "log"` unless
 * `MSG91_TRANSACTIONAL_TEMPLATE_ID` is configured.
 */
export async function sendSmsNotification(phone: string, message: string): Promise<SendSmsResult> {
  const authKey = process.env.MSG91_AUTH_KEY
  const templateId = process.env.MSG91_TRANSACTIONAL_TEMPLATE_ID

  if (!smsLiveDeliveryEnabled() || !authKey || !templateId) {
    console.log(`[sms:log] to ${phone}: ${message}`)
    return {
      sent: false,
      channel: "log",
      message: "Transactional SMS not configured (MSG91_TRANSACTIONAL_TEMPLATE_ID); logged instead",
    }
  }

  try {
    // MSG91 v5 flow-based transactional send endpoint (POST, JSON body).
    const res = await fetch("https://control.msg91.com/api/v5/flow/", {
      method: "POST",
      headers: { "Content-Type": "application/json", authkey: authKey },
      body: JSON.stringify({
        template_id: templateId,
        sender: "OBELE",
        short_url: "0",
        mobile: toMsg91Mobile(phone),
        VAR1: message,
      }),
    })
    const data = await res.json().catch(() => null)
    const sent = res.ok && (data?.type === "success" || data?.message?.includes("success"))
    return {
      sent,
      channel: sent ? "msg91" : "log",
      message: data?.message ?? `MSG91 responded with HTTP ${res.status}`,
    }
  } catch (error) {
    return {
      sent: false,
      channel: "log",
      message: error instanceof Error ? error.message : "MSG91 notification send failed",
    }
  }
}