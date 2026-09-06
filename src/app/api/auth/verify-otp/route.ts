import { NextRequest, NextResponse } from "next/server"
import { verifyOtp, AuthServiceError } from "@/server/services/auth"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await verifyOtp(request, body)
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    if (error instanceof AuthServiceError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ success: false, error: "Verification failed" }, { status: 500 })
  }
}
