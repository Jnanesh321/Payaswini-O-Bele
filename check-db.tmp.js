const { PrismaClient } = require("@prisma/client")
const p = new PrismaClient()

;(async () => {
  try {
    await p.$connect()
    const r = await p.$queryRawUnsafe("select current_user, current_database(), version()")
    console.log("CONNECT OK:", r[0].current_user, "/", r[0].current_database())
    console.log(r[0].version)
    const t = await p.$queryRawUnsafe("select tablename from pg_tables where schemaname='public' order by 1")
    console.log("TABLES:", t.map((x) => x.tablename).join(", ") || "(none yet)")
  } catch (e) {
    console.log("CONNECT FAIL:", e.message.slice(0, 300))
  } finally {
    await p.$disconnect()
  }
})()