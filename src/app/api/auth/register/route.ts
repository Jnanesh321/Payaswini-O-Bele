import { NextRequest, NextResponse } from "next/server"
import { registerUser, AuthServiceError } from "@/server/services/auth"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await registerUser(body)
    return NextResponse.json({ success: true, ...result }, { status: 201 })
  } catch (error) {
    if (error instanceof AuthServiceError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ success: false, error: "Registration failed" }, { status: 500 })
  }
}
