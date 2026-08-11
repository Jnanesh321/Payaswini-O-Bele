const { PrismaClient } = require("@prisma/client")
const p = new PrismaClient()
;(async () => {
  const b = await p.booking.findMany({
    where: { bookingRef: { startsWith: "BK" } },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      bookingRef: true,
      serviceType: true,
      toolOwnerId: true,
      farmerId: true,
      operatorFeePerDay: true,
      totalOperatorFee: true,
      subtotal: true,
      totalAmount: true,
      status: true,
      createdAt: true,
    },
  })
  console.log(JSON.stringify(b, null, 2))
  const farmers = await p.user.findMany({ select: { id: true, name: true } })
  console.log("USERS:", JSON.stringify(farmers, null, 2))
  await p.$disconnect()
})().catch(async (e) => {
  console.error(e)
  await p.$disconnect()
  process.exit(1)
})
