// prisma/seed.js
// O Bele~ — Seed data for Dakshina Karnataka farmer tool rental platform
// Run: npx prisma db seed

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

/** Convert ₹ to paise (Razorpay smallest currency unit) */
const inr = (rupees) => Math.round(rupees * 100);

const tools = [
  {
    name: "Carbon Fiber Areca Pole 12m",
    slug: "carbon-fiber-areca-pole-12m",
    description:
      "Premium 12-metre carbon fibre pole specifically designed for areca nut harvesting in Dakshina Karnataka. Ultra-lightweight at 3.2 kg — far easier to handle than bamboo poles. Adjustable sections for varying tree heights.",
    translations: {
      kn: {
        name: "ಕಾರ್ಬನ್ ಫೈಬರ್ ಅಡಿಕೆ ಕೋಲು 12 ಮೀ",
        description: "ದಕ್ಷಿಣ ಕನ್ನಡದಲ್ಲಿ ಅಡಿಕೆ ಕೊಯ್ಲಿಗಾಗಿ 12 ಮೀಟರ್ ಕಾರ್ಬನ್ ಫೈಬರ್ ಕೋಲು. ತೂಕ ಕೇವಲ 3.2 ಕೆಜಿ.",
      },
    },
    category: "CLIMBING_POLES",
    images: [
      "/images/tools/arecanut-pole.png",
    ],
    thumbnailUrl:
      "/images/tools/arecanut-pole.png",
    pricePerDay: inr(299),
    pricePerWeek: inr(1499),
    pricePerSeason: inr(4999),
    deposit: 0,

    minRentalDays: 1,
    maxRentalDays: 90,
    specs: {
      length: "12 metres",
      material: "T700 Carbon Fibre",
      weight: "3.2 kg",
      maxLoad: "15 kg",
    },
    isActive: true,
    isFeatured: true,
    deliveryAvailable: true,
    deliveryRadiusKm: 60,
    freeDeliveryRadiusKm: 25,
    requiresCertifiedOperator: true,
    operatorFeePerDay: inr(200),
  },
  {
    name: "Battery Sprayer 16L (Knapsack)",
    slug: "battery-sprayer-16l-knapsack",
    description:
      "16-litre rechargeable battery knapsack sprayer for pesticide and fertiliser application in areca, paddy, and coconut crops. 12V 8Ah lithium battery gives 5–6 hours of continuous spraying.",
    translations: {
      kn: {
        name: "ಬ್ಯಾಟರಿ ಸ್ಪ್ರೇಯರ್ 16 ಲೀ",
        description: "ಅಡಿಕೆ ಮತ್ತು ಭತ್ತದ ಬೆಳೆಗಳಿಗೆ 16 ಲೀಟರ್ ಬ್ಯಾಟರಿ ಸ್ಪ್ರೇಯರ್.",
      },
    },
    category: "SPRAYERS",
    images: [
      "/images/tools/battery-sprayer.png",
    ],
    thumbnailUrl:
      "/images/tools/battery-sprayer.png",
    pricePerDay: inr(149),
    pricePerWeek: inr(749),
    deposit: 0,

    minRentalDays: 1,
    maxRentalDays: 14,
    specs: {
      capacity: "16 litres",
      battery: "12V 8Ah Lithium",
      pressure: "2–3 bar",
    },
    isActive: true,
    isFeatured: true,
    deliveryAvailable: true,
    deliveryRadiusKm: 60,
    freeDeliveryRadiusKm: 30,
  },
  {
    name: "Power Tiller 5HP (Diesel)",
    slug: "power-tiller-5hp-diesel",
    description:
      "5 HP single-axle diesel power tiller suitable for paddy fields and areca gardens in Dakshina Karnataka. Self-propelled with adjustable tilling width (40–60 cm).",
    translations: {
      kn: {
        name: "ಪವರ್ ಟಿಲ್ಲರ್ 5HP (ಡೀಸೆಲ್)",
        description: "5HP ಡೀಸೆಲ್ ಪವರ್ ಟಿಲ್ಲರ್. ಭತ್ತದ ಗದ್ದೆಗೆ ಸೂಕ್ತ.",
      },
    },
    category: "TILLERS",
    images: [
      "/images/tools/power-tiller.png",
    ],
    thumbnailUrl:
      "/images/tools/power-tiller.png",
    pricePerDay: inr(599),
    pricePerWeek: inr(2999),
    deposit: 0,

    minRentalDays: 1,
    maxRentalDays: 14,
    specs: {
      engine: "5HP Diesel",
      weight: "180 kg",
    },
    isActive: true,
    isFeatured: true,
    deliveryAvailable: true,
    deliveryRadiusKm: 40,
    freeDeliveryRadiusKm: 15,
    requiresCertifiedOperator: true,
    operatorFeePerDay: inr(350),
  },
  {
    name: "Brush Cutter 52cc (Weed Trimmer)",
    slug: "brush-cutter-52cc-weed-trimmer",
    description:
      "High-power 52cc 2-stroke handheld brush cutter with 80-tooth circular saw blade and nylon trimmer head. Ideal for inter-crop weed management in areca nut plantations and orchard borders.",
    translations: {
      kn: {
        name: "ಬ್ರಷ್ ಕಟ್ಟರ್ 52cc (ಕಳೆ ತೆಗೆಯುವ ಯಂತ್ರ)",
        description: "ಅಡಿಕೆ ತೋಟಗಳಲ್ಲಿ ಕಳೆ ತೆಗೆಯಲು 52cc ಶಕ್ತಿಶಾಲಿ ಬ್ರಷ್ ಕಟ್ಟರ್.",
      },
    },
    category: "PRUNERS_CUTTERS",
    images: [
      "/images/tools/brush-cutter.png",
    ],
    thumbnailUrl:
      "/images/tools/brush-cutter.png",
    pricePerDay: inr(249),
    pricePerWeek: inr(1199),
    deposit: 0,

    minRentalDays: 1,
    maxRentalDays: 20,
    specs: {
      engine: "52cc 2-Stroke Petrol",
      weight: "7.8 kg",
      blade: "80T Carbide Tipped Blade",
    },
    isActive: true,
    isFeatured: true,
    deliveryAvailable: true,
    deliveryRadiusKm: 50,
    freeDeliveryRadiusKm: 20,
    requiresCertifiedOperator: false,
    operatorFeePerDay: inr(250),
  },
  {
    name: "Farm Utility Tractor 45HP (4WD)",
    slug: "farm-utility-tractor-45hp-4wd",
    description:
      "45 HP 4-wheel drive agricultural tractor equipped with rotavator and tipping trailer. Designed for heavy field preparation, wet paddy puddling, and farm haulage across coastal soils.",
    translations: {
      kn: {
        name: "ಕೃಷಿ ಟ್ರ್ಯಾಕ್ಟರ್ 45HP (4WD)",
        description: "ಭತ್ತದ ಗದ್ದೆ ಉಳುಮೆ ಮತ್ತು ಸಾಗಾಟಕ್ಕೆ 45HP 4WD ಟ್ರ್ಯಾಕ್ಟರ್.",
      },
    },
    category: "TILLERS",
    images: [
      "/images/tools/tractor.png",
    ],
    thumbnailUrl:
      "/images/tools/tractor.png",
    pricePerDay: inr(1299),
    pricePerWeek: inr(6499),
    deposit: 0,

    minRentalDays: 1,
    maxRentalDays: 30,
    specs: {
      engine: "45 HP 3-Cylinder Diesel",
      drive: "4WD All-Terrain",
      pto: "540 RPM",
    },
    isActive: true,
    isFeatured: false,
    deliveryAvailable: true,
    deliveryRadiusKm: 35,
    freeDeliveryRadiusKm: 10,
    requiresCertifiedOperator: true,
    operatorFeePerDay: inr(500),
  },
];

async function main() {
  console.log("🌱 Seeding O Bele~ database with Phase 1 domain model...\n");

  if (process.env.NODE_ENV !== "production") {
    await prisma.handoverLog.deleteMany();
    await prisma.bookingStateLog.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.order.deleteMany();
    await prisma.inventoryLog.deleteMany();
    await prisma.review.deleteMany();
    await prisma.otpRequest.deleteMany();
    await prisma.toolInstance.deleteMany();
    await prisma.tool.deleteMany();
    await prisma.selfOperatePermission.deleteMany();
    await prisma.userCapability.deleteMany();
    await prisma.user.deleteMany();
    console.log("🗑  Cleared existing seed data\n");
  }

  // 1. Seed Users (2 Farmers, 2 Tool Owners, 2 Operators, Admin; Multi-capabilities)
  const defaultPassword = await bcrypt.hash("Farmer@123", 12);
  const usersData = [
    {
      name: "O Bele Admin",
      phone: "919900000001",
      email: "admin@payaswini.com",
      passwordHash: await bcrypt.hash("Admin@OBele2025!", 12),
      isAdmin: true,
      district: "Dakshina Kannada",
      taluk: "Mangaluru",
      phoneVerified: true,
      aadhaarVerified: true,
      preferredLang: "en",
    },
    {
      name: "Raju Gowda", // Farmer + Tool Owner (Multi-capability)
      phone: "919845100001",
      passwordHash: defaultPassword,
      isAdmin: false,
      district: "Dakshina Kannada",
      taluk: "Puttur",
      village: "Kombettu",
      pincode: "574201",
      phoneVerified: true,
      aadhaarVerified: true,
      preferredLang: "kn",
    },
    {
      name: "Suresh Shetty", // Farmer
      phone: "919845100002",
      email: "suresh.shetty@example.com",
      passwordHash: defaultPassword,
      isAdmin: false,
      district: "Dakshina Kannada",
      taluk: "Sullia",
      village: "Aivarnadu",
      pincode: "574239",
      phoneVerified: true,
      aadhaarVerified: true,
      preferredLang: "kn",
    },
    {
      name: "Kavitha Poojary", // Farmer
      phone: "919845100003",
      passwordHash: defaultPassword,
      isAdmin: false,
      district: "Dakshina Kannada",
      taluk: "Bantwal",
      village: "Naravi",
      pincode: "574219",
      phoneVerified: true,
      aadhaarVerified: false,
      preferredLang: "kn",
    },
    {
      name: "Santhosh Naik", // Operator
      phone: "919845100004",
      passwordHash: defaultPassword,
      isAdmin: false,
      district: "Dakshina Kannada",
      taluk: "Puttur",
      village: "Banthwala",
      pincode: "574202",
      phoneVerified: true,
      aadhaarVerified: true,
      preferredLang: "kn",
    },
    {
      name: "Parameshwara Bhat", // Tool Owner + Operator (Multi-capability)
      phone: "919845100005",
      passwordHash: defaultPassword,
      isAdmin: false,
      district: "Dakshina Kannada",
      taluk: "Belthangady",
      village: "Ujire",
      pincode: "574240",
      phoneVerified: true,
      aadhaarVerified: true,
      preferredLang: "kn",
    },
  ];

  const createdUsers = [];
  for (const uData of usersData) {
    const user = await prisma.user.create({ data: uData });
    createdUsers.push(user);
    console.log(`👤 Created user: ${user.name} (${user.phone})`);
  }

  const adminUser = createdUsers.find((u) => u.isAdmin);
  const raju = createdUsers.find((u) => u.name === "Raju Gowda");
  const suresh = createdUsers.find((u) => u.name === "Suresh Shetty");
  const kavitha = createdUsers.find((u) => u.name === "Kavitha Poojary");
  const santhosh = createdUsers.find((u) => u.name === "Santhosh Naik");
  const parameshwara = createdUsers.find((u) => u.name === "Parameshwara Bhat");

  // 2. User Capabilities
  const capabilities = [
    { userId: raju.id, type: "FARMER", status: "VERIFIED", verifiedAt: new Date() },
    { userId: raju.id, type: "TOOL_OWNER", status: "VERIFIED", verifiedAt: new Date() },
    { userId: suresh.id, type: "FARMER", status: "VERIFIED", verifiedAt: new Date() },
    { userId: kavitha.id, type: "FARMER", status: "VERIFIED", verifiedAt: new Date() },
    { userId: santhosh.id, type: "OPERATOR", status: "VERIFIED", verifiedAt: new Date() },
    { userId: parameshwara.id, type: "TOOL_OWNER", status: "VERIFIED", verifiedAt: new Date() },
    { userId: parameshwara.id, type: "OPERATOR", status: "VERIFIED", verifiedAt: new Date() },
  ];
  for (const cap of capabilities) {
    await prisma.userCapability.create({ data: cap });
  }
  console.log(`✅ Seeded ${capabilities.length} User Capability profiles`);

  // 2.5 Self-Operate Permissions (certified-tool access grants)
  // Raju (Tool Owner) grants Suresh (Farmer) verified self-operate access to
  // his certified tools — unlocks the self-operate scenario for Suresh.
  await prisma.selfOperatePermission.create({
    data: {
      farmerId: suresh.id,
      toolOwnerId: raju.id,
      status: "VERIFIED",
      verifiedAt: new Date(),
    },
  });
  console.log("✅ Seeded 1 Self-Operate Permission (Raju → Suresh, VERIFIED)");

  // 3. Seed Tools
  const createdTools = [];
  for (const toolData of tools) {
    const tool = await prisma.tool.create({ data: toolData });
    createdTools.push(tool);
    console.log(`🔧 Created tool: ${tool.name}`);
  }

  // 4. Seed physical ToolInstances with varying statuses (AVAILABLE, MAINTENANCE)
  const poleTool = createdTools.find((t) => t.slug === "carbon-fiber-areca-pole-12m");
  const sprayerTool = createdTools.find((t) => t.slug === "battery-sprayer-16l-knapsack");
  const tillerTool = createdTools.find((t) => t.slug === "power-tiller-5hp-diesel");
  const cutterTool = createdTools.find((t) => t.slug === "brush-cutter-52cc-weed-trimmer");
  const tractorTool = createdTools.find((t) => t.slug === "farm-utility-tractor-45hp-4wd");

  const instancesData = [
    // Carbon Fiber Poles (Raju vs Parameshwara — differentiated pricing & photos)
    {
      assetCode: "CFP_12M_001",
      toolId: poleTool.id,
      ownerId: raju.id,
      status: "AVAILABLE",
      currentCustodianId: raju.id,
      pricePerDay: inr(499),
      deposit: inr(1000),
      images: ["/images/tools/carbon-fiber-pole.svg"],
      conditionGrade: "EXCELLENT",
      verificationStatus: "VERIFIED",
      rating: 4.9,
      reviewCount: 14,
      notes: "Grade A Ultra-Light Carbon Fiber 12m with safety clamp",
    },
    {
      assetCode: "CFP_12M_002",
      toolId: poleTool.id,
      ownerId: raju.id,
      status: "AVAILABLE",
      currentCustodianId: raju.id,
      pricePerDay: inr(499),
      deposit: inr(1000),
      images: ["/images/tools/carbon-fiber-pole.svg"],
      conditionGrade: "GOOD",
      verificationStatus: "VERIFIED",
      rating: 4.8,
      reviewCount: 6,
    },
    {
      assetCode: "CFP_12M_003",
      toolId: poleTool.id,
      ownerId: raju.id,
      status: "MAINTENANCE",
      currentCustodianId: raju.id,
      pricePerDay: inr(499),
      deposit: inr(1000),
      images: ["/images/tools/carbon-fiber-pole.svg"],
      conditionGrade: "FAIR",
      verificationStatus: "VERIFIED",
      rating: 4.5,
      reviewCount: 3,
      notes: "Tip clamp replacement required",
    },
    {
      assetCode: "CFP_12M_004",
      toolId: poleTool.id,
      ownerId: parameshwara.id,
      status: "AVAILABLE",
      currentCustodianId: parameshwara.id,
      pricePerDay: inr(550),
      deposit: inr(1200),
      images: ["/images/tools/carbon-fiber-pole.svg"],
      conditionGrade: "EXCELLENT",
      verificationStatus: "VERIFIED",
      rating: 4.7,
      reviewCount: 9,
      notes: "Reinforced 12m pole with harvesting sickle & nylon basket",
    },
    // Sprayers (Parameshwara vs Raju)
    {
      assetCode: "SPR_16L_001",
      toolId: sprayerTool.id,
      ownerId: parameshwara.id,
      status: "AVAILABLE",
      currentCustodianId: parameshwara.id,
      pricePerDay: inr(199),
      deposit: inr(500),
      images: ["/images/tools/battery-sprayer.svg"],
      conditionGrade: "GOOD",
      verificationStatus: "VERIFIED",
      rating: 4.8,
      reviewCount: 11,
      notes: "12V 12Ah Dual Battery Knapsack, brass lance",
    },
    {
      assetCode: "SPR_16L_002",
      toolId: sprayerTool.id,
      ownerId: parameshwara.id,
      status: "AVAILABLE",
      currentCustodianId: parameshwara.id,
      pricePerDay: inr(199),
      deposit: inr(500),
      images: ["/images/tools/battery-sprayer.svg"],
      conditionGrade: "GOOD",
      verificationStatus: "VERIFIED",
      rating: 4.7,
      reviewCount: 4,
    },
    {
      assetCode: "SPR_16L_003",
      toolId: sprayerTool.id,
      ownerId: parameshwara.id,
      status: "HANDED_OVER",
      currentCustodianId: santhosh.id,
      pricePerDay: inr(199),
      deposit: inr(500),
      images: ["/images/tools/battery-sprayer.svg"],
      conditionGrade: "GOOD",
      verificationStatus: "VERIFIED",
      rating: 4.6,
      reviewCount: 2,
    },
    {
      assetCode: "SPR_16L_004",
      toolId: sprayerTool.id,
      ownerId: raju.id,
      status: "AVAILABLE",
      currentCustodianId: raju.id,
      pricePerDay: inr(220),
      deposit: inr(500),
      images: ["/images/tools/battery-sprayer.svg"],
      conditionGrade: "EXCELLENT",
      verificationStatus: "VERIFIED",
      rating: 4.9,
      reviewCount: 7,
      notes: "Brand new high-pressure model with telescopic lance",
    },
    // Power Tillers (Raju vs Parameshwara)
    {
      assetCode: "TIL_5HP_001",
      toolId: tillerTool.id,
      ownerId: raju.id,
      status: "AVAILABLE",
      currentCustodianId: raju.id,
      pricePerDay: inr(1200),
      deposit: inr(2500),
      images: ["/images/tools/power-tiller.svg"],
      conditionGrade: "EXCELLENT",
      verificationStatus: "VERIFIED",
      rating: 4.9,
      reviewCount: 18,
      notes: "VST Shakti 13HP with rotavator attachment, wet puddling ready",
    },
    {
      assetCode: "TIL_5HP_002",
      toolId: tillerTool.id,
      ownerId: raju.id,
      status: "MAINTENANCE",
      currentCustodianId: raju.id,
      pricePerDay: inr(1200),
      deposit: inr(2500),
      images: ["/images/tools/power-tiller.svg"],
      conditionGrade: "FAIR",
      verificationStatus: "VERIFIED",
      rating: 4.6,
      reviewCount: 8,
      notes: "Oil filter change",
    },
    {
      assetCode: "TIL_5HP_003",
      toolId: tillerTool.id,
      ownerId: parameshwara.id,
      status: "AVAILABLE",
      currentCustodianId: parameshwara.id,
      pricePerDay: inr(1150),
      deposit: inr(2000),
      images: ["/images/tools/power-tiller.svg"],
      conditionGrade: "GOOD",
      verificationStatus: "VERIFIED",
      rating: 4.6,
      reviewCount: 5,
      notes: "Shriram 12HP power tiller with deep-furrow blades",
    },
    // Brush Cutters (Parameshwara)
    {
      assetCode: "CUT_52C_001",
      toolId: cutterTool.id,
      ownerId: parameshwara.id,
      status: "AVAILABLE",
      currentCustodianId: parameshwara.id,
      pricePerDay: inr(350),
      deposit: inr(500),
      images: ["/images/tools/weed-cutter.svg"],
      conditionGrade: "EXCELLENT",
      verificationStatus: "VERIFIED",
      rating: 4.8,
      reviewCount: 12,
      notes: "52cc 2-Stroke engine with 3-tooth blade and nylon spool",
    },
    {
      assetCode: "CUT_52C_002",
      toolId: cutterTool.id,
      ownerId: parameshwara.id,
      status: "AVAILABLE",
      currentCustodianId: parameshwara.id,
      pricePerDay: inr(350),
      deposit: inr(500),
      images: ["/images/tools/weed-cutter.svg"],
      conditionGrade: "GOOD",
      verificationStatus: "VERIFIED",
      rating: 4.7,
      reviewCount: 6,
    },
    // Tractors (Raju)
    {
      assetCode: "TRC_45H_001",
      toolId: tractorTool.id,
      ownerId: raju.id,
      status: "AVAILABLE",
      currentCustodianId: raju.id,
      pricePerDay: inr(1299),
      deposit: 0,
      images: ["/images/tools/tractor.png"],
      conditionGrade: "EXCELLENT",
      verificationStatus: "VERIFIED",
      rating: 5.0,
      reviewCount: 12,
      notes: "45 HP 4WD with heavy rotavator & tipping trailer",
    },
  ];

  const createdInstances = [];
  for (const inst of instancesData) {
    const instanceRow = await prisma.toolInstance.create({ data: inst });
    createdInstances.push(instanceRow);
    console.log(`📦 Seeded physical asset: ${inst.assetCode} (${inst.status})`);
  }

  // 5. Seed Parent Order & Child Bookings
  const order = await prisma.order.create({
    data: {
      orderRef: "ORD-2025-00001",
      userId: suresh.id,
      totalAmount: inr(2897),
      paymentStatus: "CAPTURED",
      razorpayOrderId: "order_seed_demo_001",
    },
  });

  const poleInstance = createdInstances.find((i) => i.assetCode === "CFP_12M_001");
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 2);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 3);

  const booking = await prisma.booking.create({
    data: {
      orderId: order.id,
      bookingRef: "OB-2025-00001",
      farmerId: suresh.id,
      toolId: poleTool.id,
      toolInstanceId: poleInstance.id,
      toolOwnerId: raju.id,
      servicePerformerId: suresh.id,
      serviceType: "SELF_SERVICE_RENTAL",
      startDate,
      endDate,
      totalDays: 3,
      toolFeePerDay: poleTool.pricePerDay,
      operatorFeePerDay: 0,
      totalToolFee: poleTool.pricePerDay * 3,
      totalOperatorFee: 0,
      deliveryFee: inr(0),
      deposit: poleTool.deposit,
      platformFee: inr(50),
      subtotal: poleTool.pricePerDay * 3,
      pricePerDay: poleTool.pricePerDay,
      totalAmount: poleTool.pricePerDay * 3 + poleTool.deposit,
      status: "TOOL_COLLECTED",
      deliveryStatus: "PICKED_UP",
      deliveryAddress: "Suresh Shetty, Aivarnadu Village, Near Temple",
    },
  });

  console.log(`📋 Seeded Order ${order.orderRef} with Child Booking ${booking.bookingRef}`);

  // 6. Seed Payment
  await prisma.payment.create({
    data: {
      orderId: order.id,
      bookingId: booking.id,
      razorpayOrderId: "order_seed_demo_001",
      razorpayPaymentId: "pay_seed_demo_001",
      amount: booking.totalAmount,
      status: "CAPTURED",
      method: "upi",
      vpa: "suresh@okicici",
      webhookVerified: true,
      webhookReceivedAt: new Date(),
    },
  });

  // 7. Seed Handover Log (Domain Rule 9 & 10 evidence)
  await prisma.handoverLog.create({
    data: {
      bookingId: booking.id,
      toolInstanceId: poleInstance.id,
      actorId: raju.id,
      handoverType: "PICKUP_FROM_OWNER",
      photos: [
        "https://res.cloudinary.com/obele/image/upload/v1/handovers/cfp-001-pickup-1.jpg",
        "https://res.cloudinary.com/obele/image/upload/v1/handovers/cfp-001-pickup-2.jpg",
      ],
      conditionGrade: "EXCELLENT",
      notes: "Inspected together at Raju's farm shed. All 6 sections locking smoothly.",
    },
  });
  console.log("📷 Seeded HandoverLog (PICKUP_FROM_OWNER with photo evidence)");

  // 8. Seed State Log
  await prisma.bookingStateLog.create({
    data: {
      bookingId: booking.id,
      fromState: "OWNER_ACCEPTED",
      toState: "TOOL_COLLECTED",
      actor: "FARMER",
      actorId: suresh.id,
      note: "Collected pole physically from Raju's farm shed",
    },
  });

  console.log("\n📊 Phase 1 Domain Seeding Complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
