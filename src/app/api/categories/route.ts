import { NextResponse } from "next/server"
import { getToolCategories } from "@/server/services/tools"

export async function GET() {
  return NextResponse.json({
    success: true,
    data: getToolCategories(),
  })
}
