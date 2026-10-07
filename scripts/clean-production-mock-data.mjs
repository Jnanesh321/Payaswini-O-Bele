/**
 * scripts/clean-production-mock-data.mjs
 * 
 * Safely purges mock/seed catalog items, demo users, and test bookings/orders
 * from the database, while strictly preserving any genuine production data.
 * 
 * Usage:
 *   node scripts/clean-production-mock-data.mjs            # Dry run (reports what would be deleted)
 *   node scripts/clean-production-mock-data.mjs --confirm  # Executes atomic deletion
 */

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read DATABASE_URL from process.env or .env.local
let dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  const envLocalPath = path.resolve(__dirname, "../.env.local");
  if (fs.existsSync(envLocalPath)) {
    const envContent = fs.readFileSync(envLocalPath, "utf-8");
    const match = envContent.match(/DATABASE_URL="([^"]+)"/);
    if (match) dbUrl = match[1];
  }
}

if (!dbUrl) {
  const envPath = path.resolve(__dirname, "../.env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    const match = envContent.match(/DATABASE_URL="([^"]+)"/);
    if (match) dbUrl = match[1];
  }
}

const prisma = new PrismaClient({
  datasources: {
    db: { url: dbUrl },
  },
});

const isExecute = process.argv.includes("--confirm") || process.argv.includes("--execute");

// Exact identifiers of mock/seed entities
const MOCK_TOOL_SLUGS = [
  "carbon-fiber-areca-pole-12m",
  "battery-sprayer-16l-knapsack",
  "power-tiller-5hp-diesel",
  "brush-cutter-52cc-weed-trimmer",
  "farm-utility-tractor-45hp-4wd",
];

const MOCK_USER_PHONES = [
  "919900000001", // O Bele Admin
  "919845100001", // Raju Gowda
  "919845100002", // Suresh Shetty
  "919845100003", // Kavitha Poojary
  "919845100004", // Santhosh Naik
  "919845100005", // Parameshwara Bhat
];

async function main() {
  console.log(`\n======================================================`);
  console.log(`🔍 Production Mock Data Audit & Removal Tool`);
  console.log(`======================================================`);
  console.log(`Mode: ${isExecute ? "🚨 EXECUTE (LIVE ATOMIC DELETION)" : "🛡️  DRY RUN (AUDIT ONLY)"}`);
  console.log(`Target DB: ${dbUrl ? dbUrl.replace(/:[^:@]+@/, ":***@") : "UNDEFINED"}\n`);

  // 1. Audit Users
  const allUsers = await prisma.user.findMany({
    select: { id: true, name: true, phone: true, email: true, firebaseUid: true, createdAt: true },
  });
  const mockUsers = allUsers.filter((u) => MOCK_USER_PHONES.includes(u.phone));
  const realUsers = allUsers.filter((u) => !MOCK_USER_PHONES.includes(u.phone));

  console.log(`👤 Users:`);
  console.log(`   - Total users in DB: ${allUsers.length}`);
  console.log(`   - Mock seed users identified: ${mockUsers.length}`);
  console.log(`   - Real / non-seed users: ${realUsers.length}`);
  if (realUsers.length > 0) {
    console.log(`   ⚠️  Found REAL users:`, realUsers.map((u) => `${u.name} (${u.phone})`));
  }

  const mockUserIds = mockUsers.map((u) => u.id);

  // 2. Audit Tools & Instances
  const allTools = await prisma.tool.findMany({
    select: { id: true, name: true, slug: true },
  });
  const mockTools = allTools.filter((t) => MOCK_TOOL_SLUGS.includes(t.slug));
  const realTools = allTools.filter((t) => !MOCK_TOOL_SLUGS.includes(t.slug));
  const mockToolIds = mockTools.map((t) => t.id);

  const mockInstances = await prisma.toolInstance.findMany({
    where: {
      OR: [
        { toolId: { in: mockToolIds } },
        { ownerId: { in: mockUserIds } },
      ],
    },
    select: { id: true, assetCode: true, tool: { select: { name: true } } },
  });

  console.log(`\n🔧 Catalog Tools & Physical Assets:`);
  console.log(`   - Total tools: ${allTools.length}`);
  console.log(`   - Mock seed tools identified: ${mockTools.length}`);
  console.log(`   - Real tools: ${realTools.length}`);
  console.log(`   - Mock physical instances identified: ${mockInstances.length}`);

  // 3. Audit Orders, Bookings, Payments, Logs
  const mockOrders = await prisma.order.findMany({
    where: { userId: { in: mockUserIds } },
    select: { id: true, orderRef: true, totalAmount: true },
  });
  const mockOrderIds = mockOrders.map((o) => o.id);

  const mockBookings = await prisma.booking.findMany({
    where: {
      OR: [
        { farmerId: { in: mockUserIds } },
        { toolOwnerId: { in: mockUserIds } },
        { toolId: { in: mockToolIds } },
        { orderId: { in: mockOrderIds } },
      ],
    },
    select: { id: true, bookingRef: true },
  });
  const mockBookingIds = mockBookings.map((b) => b.id);

  const mockPayments = await prisma.payment.findMany({
    where: {
      OR: [
        { orderId: { in: mockOrderIds } },
        { bookingId: { in: mockBookingIds } },
      ],
    },
    select: { id: true, razorpayOrderId: true, status: true },
  });

  const mockHandoverLogs = await prisma.handoverLog.findMany({
    where: {
      OR: [
        { bookingId: { in: mockBookingIds } },
        { actorId: { in: mockUserIds } },
      ],
    },
    select: { id: true },
  });

  const mockStateLogs = await prisma.bookingStateLog.findMany({
    where: {
      OR: [
        { bookingId: { in: mockBookingIds } },
        { actorId: { in: mockUserIds } },
      ],
    },
    select: { id: true },
  });

  const mockCapabilities = await prisma.userCapability.findMany({
    where: { userId: { in: mockUserIds } },
    select: { id: true, type: true },
  });

  const mockSelfOperatePerms = await prisma.selfOperatePermission.findMany({
    where: {
      OR: [
        { farmerId: { in: mockUserIds } },
        { toolOwnerId: { in: mockUserIds } },
      ],
    },
    select: { id: true },
  });

  console.log(`\n📋 Transactions & Operational Logs:`);
  console.log(`   - Mock orders: ${mockOrders.length}`);
  console.log(`   - Mock bookings: ${mockBookings.length}`);
  console.log(`   - Mock payments: ${mockPayments.length}`);
  console.log(`   - Mock handover logs: ${mockHandoverLogs.length}`);
  console.log(`   - Mock booking state logs: ${mockStateLogs.length}`);
  console.log(`   - Mock user capabilities: ${mockCapabilities.length}`);
  console.log(`   - Mock self-operate permissions: ${mockSelfOperatePerms.length}`);

  const totalMockRecords =
    mockUsers.length +
    mockTools.length +
    mockInstances.length +
    mockOrders.length +
    mockBookings.length +
    mockPayments.length +
    mockHandoverLogs.length +
    mockStateLogs.length +
    mockCapabilities.length +
    mockSelfOperatePerms.length;

  console.log(`\n------------------------------------------------------`);
  console.log(`📊 TOTAL MOCK/DEMO RECORDS IDENTIFIED FOR PURGE: ${totalMockRecords}`);
  console.log(`------------------------------------------------------\n`);

  if (!isExecute) {
    console.log(`ℹ️  This was a DRY RUN. No records were modified or deleted.`);
    console.log(`To execute this purge atomically, re-run with:`);
    console.log(`   node scripts/clean-production-mock-data.mjs --confirm\n`);
    return;
  }

  console.log(`🚀 Executing atomic purge within Prisma transaction...`);

  await prisma.$transaction(async (tx) => {
    // 1. Delete logs & payments (depend on bookings & orders)
    if (mockHandoverLogs.length > 0) {
      const res = await tx.handoverLog.deleteMany({
        where: { id: { in: mockHandoverLogs.map((h) => h.id) } },
      });
      console.log(`   ✓ Deleted ${res.count} HandoverLogs`);
    }

    if (mockStateLogs.length > 0) {
      const res = await tx.bookingStateLog.deleteMany({
        where: { id: { in: mockStateLogs.map((s) => s.id) } },
      });
      console.log(`   ✓ Deleted ${res.count} BookingStateLogs`);
    }

    if (mockPayments.length > 0) {
      const res = await tx.payment.deleteMany({
        where: { id: { in: mockPayments.map((p) => p.id) } },
      });
      console.log(`   ✓ Deleted ${res.count} Payments`);
    }

    // 2. Delete bookings
    if (mockBookings.length > 0) {
      const res = await tx.booking.deleteMany({
        where: { id: { in: mockBookingIds } },
      });
      console.log(`   ✓ Deleted ${res.count} Bookings`);
    }

    // 3. Delete orders
    if (mockOrders.length > 0) {
      const res = await tx.order.deleteMany({
        where: { id: { in: mockOrderIds } },
      });
      console.log(`   ✓ Deleted ${res.count} Orders`);
    }

    // 4. Delete tool instances
    if (mockInstances.length > 0) {
      const res = await tx.toolInstance.deleteMany({
        where: { id: { in: mockInstances.map((i) => i.id) } },
      });
      console.log(`   ✓ Deleted ${res.count} ToolInstances`);
    }

    // 5. Delete tools
    if (mockTools.length > 0) {
      const res = await tx.tool.deleteMany({
        where: { id: { in: mockToolIds } },
      });
      console.log(`   ✓ Deleted ${res.count} Tools`);
    }

    // 6. Delete permissions & capabilities
    if (mockSelfOperatePerms.length > 0) {
      const res = await tx.selfOperatePermission.deleteMany({
        where: { id: { in: mockSelfOperatePerms.map((p) => p.id) } },
      });
      console.log(`   ✓ Deleted ${res.count} SelfOperatePermissions`);
    }

    if (mockCapabilities.length > 0) {
      const res = await tx.userCapability.deleteMany({
        where: { id: { in: mockCapabilities.map((c) => c.id) } },
      });
      console.log(`   ✓ Deleted ${res.count} UserCapabilities`);
    }

    // 7. Delete users
    if (mockUsers.length > 0) {
      const res = await tx.user.deleteMany({
        where: { id: { in: mockUserIds } },
      });
      console.log(`   ✓ Deleted ${res.count} Users`);
    }
  });

  console.log(`\n🎉 Success! All ${totalMockRecords} mock/seed records purged from the production database.`);
  console.log(`The production database is now clean and ready for real users and real catalog listings.\n`);
}

main()
  .catch((err) => {
    console.error(`\n❌ Error during cleanup:`, err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
