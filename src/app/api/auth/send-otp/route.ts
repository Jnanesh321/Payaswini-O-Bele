import { NextRequest, NextResponse } from "next/server"
import { sendOtp, AuthServiceError } from "@/server/services/auth"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await sendOtp(request, body.phone)
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    if (error instanceof AuthServiceError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ success: false, error: "Failed to send OTP" }, { status: 500 })
  }
}
