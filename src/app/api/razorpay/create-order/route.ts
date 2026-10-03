import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { createRazorpayOrder, PaymentServiceError } from "@/server/services/payments"

export async function POST(request: NextRequest) {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const result = await createRazorpayOrder({
      userId: session.user.id,
      items: body?.items,
      deliveryType: body?.deliveryType,
      deliveryAddress: body?.deliveryAddress,
    })
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    if (error instanceof PaymentServiceError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error("Razorpay order creation failed:", error)
    return NextResponse.json({ success: false, error: "Failed to create order" }, { status: 500 })
  }
}
