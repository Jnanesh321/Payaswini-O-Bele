import { NextRequest, NextResponse } from "next/server"
import { handleRazorpayWebhook, PaymentServiceError } from "@/server/services/payments"

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get("x-razorpay-signature") || ""

    if (!signature) {
      return NextResponse.json(
        { success: false, error: "Missing x-razorpay-signature header" },
        { status: 400 }
      )
    }

    const result = await handleRazorpayWebhook({ rawBody, signature })
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    if (error instanceof PaymentServiceError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    console.error("[Razorpay Webhook] Unexpected error:", error)
    return NextResponse.json(
      { success: false, error: "Webhook processing failed" },
      { status: 500 }
    )
  }
}
