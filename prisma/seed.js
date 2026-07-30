// prisma/seed.js
// O Bele~ — Seed data for Dakshina Karnataka farmer tool rental platform
// Run: npx prisma db seed

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Convert ₹ to paise (Razorpay uses smallest currency unit) */
const inr = (rupees) => Math.round(rupees * 100);

// ─── Tool Data ───────────────────────────────────────────────────────────────

const tools = [
  // ── Carbon Fiber Poles ──────────────────────────────────────────────────
  {
    name: "Carbon Fiber Areca Pole 12m",
    nameKn: "ಕಾರ್ಬನ್ ಫೈಬರ್ ಅಡಿಕೆ ಕೋಲು 12 ಮೀ",
    slug: "carbon-fiber-areca-pole-12m",
    description:
      "Premium 12-metre carbon fibre pole specifically designed for areca nut (supari) harvesting in Dakshina Karnataka. Ultra-lightweight at 3.2 kg — far easier to handle than bamboo poles. Adjustable sections for varying tree heights. Fits a standard harvesting hook attachment.",
    descriptionKn:
      "ದಕ್ಷಿಣ ಕನ್ನಡದಲ್ಲಿ ಅಡಿಕೆ ಕೊಯ್ಲಿಗಾಗಿ ವಿಶೇಷವಾಗಿ ವಿನ್ಯಾಸಗೊಳಿಸಿದ 12 ಮೀಟರ್ ಕಾರ್ಬನ್ ಫೈಬರ್ ಕೋಲು. ತೂಕ ಕೇವಲ 3.2 ಕೆಜಿ — ಬಿದಿರು ಕೋಲಿಗಿಂತ ಹಗುರ.",
    category: "CLIMBING_POLES",
    images: [
      "https://res.cloudinary.com/obele/image/upload/v1/tools/cf-pole-12m-1.jpg",
      "https://res.cloudinary.com/obele/image/upload/v1/tools/cf-pole-12m-2.jpg",
    ],
    thumbnailUrl:
      "https://res.cloudinary.com/obele/image/upload/v1/tools/cf-pole-12m-thumb.jpg",
    pricePerDay: inr(299),
    pricePerWeek: inr(1499),
    pricePerSeason: inr(4999),
    deposit: inr(2000),
    availableCount: 8,
    totalCount: 10,
    minRentalDays: 1,
    maxRentalDays: 90,
    specs: {
      length: "12 metres",
      sections: 6,
      material: "T700 Carbon Fibre",
      weight: "3.2 kg",
      maxLoad: "15 kg",
      diameter: "28mm (base) → 18mm (tip)",
      compatibleWith: "Standard areca harvesting hook",
      storage: "6-section collapsible to 2.2m",
      colour: "Matte Black",
    },
    isActive: true,
    isFeatured: true,
    deliveryAvailable: true,
    deliveryRadiusKm: 60,
    freeDeliveryRadiusKm: 25,
  },
  {
    name: "Carbon Fiber Areca Pole 9m",
    nameKn: "ಕಾರ್ಬನ್ ಫೈಬರ್ ಅಡಿಕೆ ಕೋಲು 9 ಮೀ",
    slug: "carbon-fiber-areca-pole-9m",
    description:
      "9-metre carbon fibre pole ideal for younger areca nut trees (5–8 years). Lighter and easier to manoeuvre than the 12m variant. Popular among farmers in Puttur and Sullia taluks. Collapses into 4 sections for easy transport on a two-wheeler.",
    descriptionKn:
      "ಚಿಕ್ಕ ಅಡಿಕೆ ಮರಗಳಿಗೆ (5–8 ವರ್ಷ) ಸೂಕ್ತವಾದ 9 ಮೀಟರ್ ಕಾರ್ಬನ್ ಫೈಬರ್ ಕೋಲು. ಪುತ್ತೂರು ಮತ್ತು ಸುಳ್ಯ ತಾಲೂಕಿನ ರೈತರಲ್ಲಿ ಜನಪ್ರಿಯ.",
    category: "CLIMBING_POLES",
    images: [
      "https://res.cloudinary.com/obele/image/upload/v1/tools/cf-pole-9m-1.jpg",
    ],
    thumbnailUrl:
      "https://res.cloudinary.com/obele/image/upload/v1/tools/cf-pole-9m-thumb.jpg",
    pricePerDay: inr(199),
    pricePerWeek: inr(999),
    pricePerSeason: inr(2999),
    deposit: inr(1500),
    availableCount: 12,
    totalCount: 15,
    minRentalDays: 1,
    maxRentalDays: 90,
    specs: {
      length: "9 metres",
      sections: 4,
      material: "T700 Carbon Fibre",
      weight: "2.1 kg",
      maxLoad: "12 kg",
      diameter: "25mm (base) → 16mm (tip)",
      compatibleWith: "Standard areca harvesting hook",
      storage: "4-section collapsible to 2.4m",
      colour: "Matte Black",
    },
    isActive: true,
    isFeatured: true,
    deliveryAvailable: true,
    deliveryRadiusKm: 60,
    freeDeliveryRadiusKm: 25,
  },

  // ── Tillers ─────────────────────────────────────────────────────────────
  {
    name: "Power Tiller 5HP (Diesel)",
    nameKn: "ಪವರ್ ಟಿಲ್ಲರ್ 5HP (ಡೀಸೆಲ್)",
    slug: "power-tiller-5hp-diesel",
    description:
      "5 HP single-axle diesel power tiller suitable for paddy fields, areca gardens, and coconut plantations in Dakshina Karnataka. Self-propelled with adjustable tilling width (40–60 cm). Includes rotavator and ridger attachments. Diesel not included.",
    descriptionKn:
      "ಭತ್ತದ ಗದ್ದೆ, ಅಡಿಕೆ ತೋಟ ಮತ್ತು ತೆಂಗಿನ ತೋಟಕ್ಕೆ ಸೂಕ್ತವಾದ 5HP ಡೀಸೆಲ್ ಪವರ್ ಟಿಲ್ಲರ್. ಡೀಸೆಲ್ ಸೇರಿಲ್ಲ.",
    category: "TILLERS",
    images: [
      "https://res.cloudinary.com/obele/image/upload/v1/tools/power-tiller-5hp-1.jpg",
    ],
    thumbnailUrl:
      "https://res.cloudinary.com/obele/image/upload/v1/tools/power-tiller-5hp-thumb.jpg",
    pricePerDay: inr(599),
    pricePerWeek: inr(2999),
    deposit: inr(5000),
    availableCount: 3,
    totalCount: 4,
    minRentalDays: 1,
    maxRentalDays: 14,
    specs: {
      engine: "5HP Single Cylinder Diesel",
      fuelCapacity: "3.6 litres",
      tillingWidth: "40–60 cm (adjustable)",
      tillingDepth: "up to 20 cm",
      weight: "180 kg",
      transmission: "2F + 1R",
      attachments: "Rotavator, Ridger, Blade set",
      brand: "VST Shakti",
    },
    isActive: true,
    isFeatured: false,
    deliveryAvailable: true,
    deliveryRadiusKm: 40,
    freeDeliveryRadiusKm: 15,
    deliveryChargePerKm: inr(5),
  },

  // ── Nets ────────────────────────────────────────────────────────────────
  {
    name: "Arecanut Harvesting Net (10m × 10m)",
    nameKn: "ಅಡಿಕೆ ಕೊಯ್ಲು ಬಲೆ (10ಮೀ × 10ಮೀ)",
    slug: "arecanut-harvesting-net-10x10",
    description:
      "Heavy-duty HDPE net spread beneath areca nut trees during harvesting to collect fallen nuts. 10m × 10m covers approximately 4–5 trees at once. UV-stabilised for outdoor use, easy to fold and transport. Reduces nut loss by up to 30% versus traditional ground collection.",
    descriptionKn:
      "ಅಡಿಕೆ ಕೊಯ್ಲಿನ ಸಮಯದಲ್ಲಿ ಮರದ ಕೆಳಗೆ ಹರಡುವ HDPE ಬಲೆ. 10ಮೀ × 10ಮೀ ಗಾತ್ರ 4–5 ಮರಗಳನ್ನು ಆವರಿಸುತ್ತದೆ.",
    category: "NETS_COVERS",
    images: [
      "https://res.cloudinary.com/obele/image/upload/v1/tools/areca-net-1.jpg",
    ],
    thumbnailUrl:
      "https://res.cloudinary.com/obele/image/upload/v1/tools/areca-net-thumb.jpg",
    pricePerDay: inr(99),
    pricePerWeek: inr(499),
    deposit: inr(500),
    availableCount: 20,
    totalCount: 20,
    minRentalDays: 1,
    maxRentalDays: 30,
    specs: {
      size: "10m × 10m",
      material: "UV-stabilised HDPE",
      meshSize: "20mm × 20mm",
      weight: "4.5 kg",
      colour: "Green",
      foldedSize: "50cm × 40cm × 15cm",
      treesCovered: "4–5 areca trees simultaneously",
    },
    isActive: true,
    isFeatured: false,
    deliveryAvailable: true,
    deliveryRadiusKm: 60,
    freeDeliveryRadiusKm: 30,
  },

  // ── Transplanters ───────────────────────────────────────────────────────
  {
    name: "Manual Paddy Transplanter (8-Row)",
    nameKn: "ಭತ್ತ ನಾಟಿ ಯಂತ್ರ (8 ಸಾಲು)",
    slug: "manual-paddy-transplanter-8-row",
    description:
      "8-row manual paddy transplanter for wet paddy fields. Plants 8 rows simultaneously at 25 cm × 14 cm spacing — the recommended spacing for high-yield paddy varieties grown in Dakshina Karnataka (Jyothi, Mugad, IR64). Transplants approximately 1 acre in 4–5 hours with 2 operators.",
    descriptionKn:
      "ಭತ್ತದ ಗದ್ದೆಗೆ 8 ಸಾಲಿನ ಕೈ ನಾಟಿ ಯಂತ್ರ. 25 ಸೆಂ.ಮೀ × 14 ಸೆಂ.ಮೀ ಅಂತರದಲ್ಲಿ 8 ಸಾಲು ಏಕಕಾಲದಲ್ಲಿ ನಾಟಿ ಮಾಡುತ್ತದೆ.",
    category: "TRANSPLANTERS",
    images: [
      "https://res.cloudinary.com/obele/image/upload/v1/tools/transplanter-8row-1.jpg",
    ],
    thumbnailUrl:
      "https://res.cloudinary.com/obele/image/upload/v1/tools/transplanter-8row-thumb.jpg",
    pricePerDay: inr(499),
    pricePerWeek: inr(2499),
    deposit: inr(3000),
    availableCount: 4,
    totalCount: 5,
    minRentalDays: 1,
    maxRentalDays: 14,
    specs: {
      rows: 8,
      rowSpacing: "25 cm",
      plantSpacing: "14 cm",
      capacity: "0.8–1 acre per day (2 operators)",
      seedlingAge: "18–25 days",
      weight: "22 kg",
      requiredOperators: 2,
      suitableFor: "Jyothi, Mugad, IR64, Sona Masuri",
    },
    isActive: true,
    isFeatured: false,
    deliveryAvailable: true,
    deliveryRadiusKm: 50,
    freeDeliveryRadiusKm: 20,
  },

  // ── Sprayers ────────────────────────────────────────────────────────────
  {
    name: "Battery Sprayer 16L (Knapsack)",
    nameKn: "ಬ್ಯಾಟರಿ ಸ್ಪ್ರೇಯರ್ 16 ಲೀ",
    slug: "battery-sprayer-16l-knapsack",
    description:
      "16-litre rechargeable battery knapsack sprayer for pesticide and fertiliser application in areca, paddy, and coconut crops. 12V 8Ah lithium battery gives 5–6 hours of continuous spraying on a single charge. Adjustable nozzle with 3m spray hose. Includes charger and 2 nozzle types.",
    descriptionKn:
      "ಅಡಿಕೆ, ಭತ್ತ ಮತ್ತು ತೆಂಗಿನ ಬೆಳೆಗಳಿಗೆ ಔಷಧ ಮತ್ತು ಗೊಬ್ಬರ ಸಿಂಪಡಿಸಲು 16 ಲೀಟರ್ ಬ್ಯಾಟರಿ ಸ್ಪ್ರೇಯರ್.",
    category: "SPRAYERS",
    images: [
      "https://res.cloudinary.com/obele/image/upload/v1/tools/battery-sprayer-16l-1.jpg",
    ],
    thumbnailUrl:
      "https://res.cloudinary.com/obele/image/upload/v1/tools/battery-sprayer-16l-thumb.jpg",
    pricePerDay: inr(149),
    pricePerWeek: inr(749),
    deposit: inr(1000),
    availableCount: 10,
    totalCount: 10,
    minRentalDays: 1,
    maxRentalDays: 14,
    specs: {
      capacity: "16 litres",
      battery: "12V 8Ah Lithium",
      batteryLife: "5–6 hours continuous",
      chargingTime: "3–4 hours",
      pressure: "2–3 bar (adjustable)",
      flowRate: "1.2 L/min",
      hoseLength: "3 metres",
      nozzles: "Fan nozzle + hollow cone nozzle",
      weight: "5.5 kg (empty)",
    },
    isActive: true,
    isFeatured: false,
    deliveryAvailable: true,
    deliveryRadiusKm: 60,
    freeDeliveryRadiusKm: 30,
  },
];

// ─── Main seed ────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding O Bele~ database...\n");

  // 1. Clear existing data (dev only — never run in production!)
  if (process.env.NODE_ENV !== "production") {
    await prisma.inventoryLog.deleteMany();
    await prisma.review.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.otpRequest.deleteMany();
    await prisma.tool.deleteMany();
    await prisma.user.deleteMany();
    console.log("🗑  Cleared existing seed data\n");
  }

  // 2. Seed users
  const usersData = [
    {
      name: "O Bele Admin",
      phone: "+919900000001",
      email: "admin@payaswini.com",
      passwordHash: await bcrypt.hash("Admin@OBele2025!", 12),
      role: "ADMIN",
      district: "Dakshina Kannada",
      taluk: "Mangaluru",
      phoneVerified: true,
      aadhaarVerified: true,
      preferredLang: "en",
    },
    {
      name: "Raju Gowda",
      phone: "+919845100001",
      passwordHash: await bcrypt.hash("Farmer@123", 12),
      role: "FARMER",
      district: "Dakshina Kannada",
      taluk: "Puttur",
      village: "Kombettu",
      pincode: "574201",
      phoneVerified: true,
      aadhaarVerified: false,
      preferredLang: "kn",
    },
    {
      name: "Suresh Shetty",
      phone: "+919845100002",
      email: "suresh.shetty@example.com",
      passwordHash: await bcrypt.hash("Farmer@123", 12),
      role: "FARMER",
      district: "Dakshina Kannada",
      taluk: "Sullia",
      village: "Aivarnadu",
      pincode: "574239",
      phoneVerified: true,
      aadhaarVerified: true,
      preferredLang: "kn",
    },
    {
      name: "Kavitha Poojary",
      phone: "+919845100003",
      passwordHash: await bcrypt.hash("Farmer@123", 12),
      role: "FARMER",
      district: "Dakshina Kannada",
      taluk: "Bantwal",
      village: "Naravi",
      pincode: "574219",
      phoneVerified: true,
      aadhaarVerified: false,
      preferredLang: "kn",
    },
  ];

  const createdUsers = [];
  for (const userData of usersData) {
    const user = await prisma.user.create({ data: userData });
    createdUsers.push(user);
    console.log(`👤 Created user: ${user.name} (${user.phone})`);
  }

  // 3. Seed tools
  const createdTools = [];
  for (const toolData of tools) {
    const tool = await prisma.tool.create({ data: toolData });
    createdTools.push(tool);
    console.log(`🔧 Created tool: ${tool.name} (₹${tool.pricePerDay / 100}/day)`);
  }

  // 4. Seed a sample booking (Raju renting a 12m pole for 3 days)
  const rajuUser = createdUsers.find((u) => u.name === "Raju Gowda");
  const pole12m = createdTools.find((t) => t.slug === "carbon-fiber-areca-pole-12m");

  if (rajuUser && pole12m) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 2);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 3);
    const totalDays = 3;
    const subtotal = pole12m.pricePerDay * totalDays;

    const booking = await prisma.booking.create({
      data: {
        bookingRef: "OB-2025-00001",
        userId: rajuUser.id,
        toolId: pole12m.id,
        startDate,
        endDate,
        totalDays,
        pricePerDay: pole12m.pricePerDay,
        subtotal,
        deposit: pole12m.deposit,
        deliveryCharge: 0,
        totalAmount: subtotal + pole12m.deposit,
        status: "CONFIRMED",
        deliveryStatus: "SCHEDULED",
        deliveryAddress: "Raju Gowda, Kombettu Village, Near Govt School",
        deliveryDistrict: "Dakshina Kannada",
        deliveryTaluk: "Puttur",
        deliveryPincode: "574201",
      },
    });

    console.log(`\n📋 Created sample booking: ${booking.bookingRef}`);

    // Sample payment
    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        razorpayOrderId: "order_seed_demo_001",
        razorpayPaymentId: "pay_seed_demo_001",
        amount: booking.totalAmount,
        status: "CAPTURED",
        method: "upi",
        vpa: "raju@okaxis",
        webhookVerified: true,
        webhookReceivedAt: new Date(),
      },
    });
    console.log("💳 Created sample payment (UPI)");

    // Sample reviews
    const reviews = [
      {
        userId: rajuUser.id,
        toolId: pole12m.id,
        rating: 5,
        comment: "Very light pole compared to bamboo. Helped me finish harvesting 2 acres in 2 days instead of 4. Worth every rupee.",
        commentKn: "ಬಿದಿರು ಕೋಲಿಗೆ ಹೋಲಿಸಿದರೆ ತುಂಬಾ ಹಗುರ. 2 ದಿನದಲ್ಲಿ 2 ಎಕರೆ ಮುಗಿಯಿತು.",
      },
    ];
    for (const review of reviews) {
      await prisma.review.create({ data: review });
    }
    console.log("⭐ Created sample reviews");
  }

  // Summary
  console.log("\n📊 Seed complete! Summary:");
  console.log(`   Users : ${createdUsers.length}`);
  console.log(`   Tools : ${createdTools.length}`);
  console.log(`   Bookings: 1 sample`);
  console.log(`   Payments: 1 sample`);
  console.log(`   Reviews: 1 sample`);
  console.log("\n🌾 O Bele~ is ready to serve Dakshina Karnataka farmers!\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
