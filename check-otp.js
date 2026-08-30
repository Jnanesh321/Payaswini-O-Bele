const fs = require("fs")
const path = require("path")

// Automatically load .env.local (or .env) so CLI script connects to the same DB as Next.js
const envLocalPath = path.join(__dirname, ".env.local")
const envPath = path.join(__dirname, ".env")
const targetEnv = fs.existsSync(envLocalPath) ? envLocalPath : envPath

if (fs.existsSync(targetEnv)) {
  const content = fs.readFileSync(targetEnv, "utf8")
  for (const line of content.split("\n")) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=")
      const key = trimmed.slice(0, idx).trim()
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "")
      if (key === "DATABASE_URL" || !process.env[key]) {
        process.env[key] = val
      }
    }
  }
}

const { PrismaClient } = require("@prisma/client")
const p = new PrismaClient()

;(async () => {
  // Read target phone from CLI args (e.g., node check-otp.js 9876543210 or 919876543210)
  const rawPhone = process.argv[2]

  let whereClause = {}
  if (rawPhone) {
    const digits = rawPhone.replace(/\D/g, "")
    const normalized = digits.length === 10 ? `91${digits}` : digits
    whereClause = {
      OR: [
        { phone: normalized },
        { phone: digits },
        { phone: rawPhone },
      ],
    }
  }

  const req = await p.otpRequest.findFirst({
    where: whereClause,
    orderBy: { createdAt: "desc" },
  })

  if (!req) {
    console.log(JSON.stringify({ message: "No OTP requests found", phone: rawPhone || "any" }))
  } else {
    console.log(JSON.stringify({ phone: req.phone, otp: req.otp, expiresAt: req.expiresAt }))
  }

  await p.$disconnect()
})().catch(async (e) => {
  console.error(e)
  await p.$disconnect()
  process.exit(1)
})