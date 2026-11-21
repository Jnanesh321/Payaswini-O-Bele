import { NextRequest, NextResponse } from "next/server"
import { requireAuth, AuthGuardError } from "@/server/lib/auth-guard"
import fs from "fs"
import path from "path"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 })
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ success: false, error: "Only image files are allowed" }, { status: 400 })
    }

    // Limit to 10MB input before compression
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: "File exceeds 10MB limit" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Determine extension
    const mimeExtMap: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/jpg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "image/heic": ".heic",
    }
    const ext = mimeExtMap[file.type] || ".jpg"
    const filename = `tool_${Date.now()}_${crypto.randomBytes(4).toString("hex")}${ext}`

    // Attempt writing to public/uploads
    try {
      const uploadsDir = path.join(process.cwd(), "public", "uploads")
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true })
      }
      const filePath = path.join(uploadsDir, filename)
      fs.writeFileSync(filePath, buffer)

      return NextResponse.json({
        success: true,
        url: `/uploads/${filename}`,
      })
    } catch (writeErr) {
      // In serverless / read-only environment without persistent disk, return base64 data URL
      console.warn("[UploadAPI] Filesystem write failed, falling back to base64 data URI:", writeErr)
      const base64 = buffer.toString("base64")
      const dataUri = `data:${file.type};base64,${base64}`
      return NextResponse.json({
        success: true,
        url: dataUri,
      })
    }
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
    }
    console.error("[UploadAPI] Upload error:", error)
    return NextResponse.json({ success: false, error: "Failed to upload image" }, { status: 500 })
  }
}
