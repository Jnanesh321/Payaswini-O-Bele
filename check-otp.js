const { PrismaClient } = require("@prisma/client")
const p = new PrismaClient()
;(async () => {
  const req = await p.otpRequest.findFirst({
    where: { phone: "919845100002" },
    orderBy: { createdAt: "desc" },
  })
  console.log(JSON.stringify({ phone: req?.phone, otp: req?.otp, expiresAt: req?.expiresAt }))
  await p.$disconnect()
})().catch(async (e) => {
  console.error(e)
  await p.$disconnect()
  process.exit(1)
})
