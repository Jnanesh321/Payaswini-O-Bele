-- CreateEnum
CREATE TYPE "CapabilityType" AS ENUM ('FARMER', 'TOOL_OWNER', 'OPERATOR');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'SUSPENDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "BookingServiceType" AS ENUM ('SELF_SERVICE_RENTAL', 'SELF_SERVICE_OWN_TOOL', 'OPERATOR_ONLY', 'OWNER_OPERATED', 'FULL_LOGISTICS');

-- CreateEnum
CREATE TYPE "ToolCategory" AS ENUM ('CLIMBING_POLES', 'TILLERS', 'NETS_COVERS', 'TRANSPLANTERS', 'SPRAYERS', 'PRUNERS_CUTTERS', 'WATER_PUMPS', 'HARVESTING_TOOLS', 'OTHER');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('REQUESTED', 'OWNER_PENDING', 'OWNER_ACCEPTED', 'OPERATOR_PENDING', 'OPERATOR_ASSIGNED', 'OPERATOR_ACCEPTED', 'FETCHING_TOOL', 'TOOL_COLLECTED', 'TRAVELLING_TO_FARM', 'ARRIVED', 'WORK_STARTED', 'WORK_PAUSED', 'WORK_RESUMED', 'WORK_COMPLETED', 'RETURNING_TOOL', 'TOOL_RETURNED', 'INSPECTION', 'COMPLETED', 'CANCELLED_BY_FARMER', 'CANCELLED_BY_OWNER', 'CANCELLED_BY_OPERATOR', 'CANCELLED_BY_PLATFORM', 'FAILED_NO_OPERATOR', 'DISPUTED');

-- CreateEnum
CREATE TYPE "BookingEventActor" AS ENUM ('FARMER', 'TOOL_OWNER', 'OPERATOR', 'ADMIN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'CAPTURED', 'REFUNDED', 'FAILED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('SCHEDULED', 'IN_TRANSIT', 'DELIVERED', 'PICKED_UP', 'RETURNED');

-- CreateEnum
CREATE TYPE "ToolInstanceStatus" AS ENUM ('AVAILABLE', 'MAINTENANCE', 'RESERVED', 'HANDED_OVER', 'IN_USE', 'RETURNED', 'INSPECTION', 'LOST', 'DAMAGED', 'RETIRED');

-- CreateEnum
CREATE TYPE "HandoverType" AS ENUM ('PICKUP_FROM_OWNER', 'DELIVERY_TO_FARMER', 'RETURN_FROM_FARMER', 'RETURN_TO_OWNER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "district" TEXT,
    "taluk" TEXT,
    "village" TEXT,
    "pincode" TEXT,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "aadhaarVerified" BOOLEAN NOT NULL DEFAULT false,
    "preferredLang" TEXT NOT NULL DEFAULT 'en',
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "otp_requests" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,

    CONSTRAINT "otp_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limits" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_capabilities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "CapabilityType" NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verifiedAt" TIMESTAMP(3),
    "deniedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_capabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "self_operate_permissions" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "toolOwnerId" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "self_operate_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tools" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "translations" JSONB,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ToolCategory" NOT NULL DEFAULT 'OTHER',
    "images" TEXT[],
    "thumbnailUrl" TEXT,
    "pricePerDay" INTEGER NOT NULL,
    "pricePerWeek" INTEGER,
    "pricePerSeason" INTEGER,
    "deposit" INTEGER NOT NULL DEFAULT 0,
    "availableCount" INTEGER NOT NULL DEFAULT 0,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "minRentalDays" INTEGER NOT NULL DEFAULT 1,
    "maxRentalDays" INTEGER NOT NULL DEFAULT 30,
    "specs" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "deliveryAvailable" BOOLEAN NOT NULL DEFAULT true,
    "deliveryRadiusKm" INTEGER NOT NULL DEFAULT 50,
    "freeDeliveryRadiusKm" INTEGER NOT NULL DEFAULT 20,
    "deliveryChargePerKm" INTEGER DEFAULT 0,
    "requiresCertifiedOperator" BOOLEAN NOT NULL DEFAULT false,
    "operatorFeePerDay" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_instances" (
    "id" TEXT NOT NULL,
    "assetCode" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "status" "ToolInstanceStatus" NOT NULL DEFAULT 'AVAILABLE',
    "currentCustodianId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tool_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "orderRef" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "razorpayOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "bookingRef" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "toolInstanceId" TEXT,
    "toolOwnerId" TEXT NOT NULL,
    "servicePerformerId" TEXT NOT NULL,
    "serviceType" "BookingServiceType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalDays" INTEGER NOT NULL,
    "toolFeePerDay" INTEGER NOT NULL DEFAULT 0,
    "operatorFeePerDay" INTEGER NOT NULL DEFAULT 0,
    "totalToolFee" INTEGER NOT NULL DEFAULT 0,
    "totalOperatorFee" INTEGER NOT NULL DEFAULT 0,
    "deliveryFee" INTEGER NOT NULL DEFAULT 0,
    "deposit" INTEGER NOT NULL DEFAULT 0,
    "platformFee" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" INTEGER NOT NULL,
    "pricePerDay" INTEGER NOT NULL DEFAULT 0,
    "subtotal" INTEGER NOT NULL DEFAULT 0,
    "status" "BookingStatus" NOT NULL DEFAULT 'REQUESTED',
    "deliveryStatus" "DeliveryStatus" NOT NULL DEFAULT 'SCHEDULED',
    "deliveryAddress" TEXT,
    "deliveryDistrict" TEXT,
    "deliveryTaluk" TEXT,
    "deliveryPincode" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "handover_logs" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "toolInstanceId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "handoverType" "HandoverType" NOT NULL,
    "photos" TEXT[],
    "conditionGrade" TEXT NOT NULL DEFAULT 'GOOD',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "handover_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_state_logs" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "fromState" "BookingStatus" NOT NULL,
    "toState" "BookingStatus" NOT NULL,
    "actor" "BookingEventActor" NOT NULL,
    "actorId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_state_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "orderId" TEXT,
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "amount" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "method" TEXT,
    "vpa" TEXT,
    "webhookVerified" BOOLEAN NOT NULL DEFAULT false,
    "webhookReceivedAt" TIMESTAMP(3),
    "depositFrozen" BOOLEAN NOT NULL DEFAULT false,
    "depositDeducted" INTEGER NOT NULL DEFAULT 0,
    "depositRefunded" INTEGER NOT NULL DEFAULT 0,
    "disputeLocked" BOOLEAN NOT NULL DEFAULT false,
    "depositRefundId" TEXT,
    "refundAmount" INTEGER NOT NULL DEFAULT 0,
    "cancellationFee" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "commentKn" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_logs" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "change" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "bookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE INDEX "otp_requests_phone_otp_idx" ON "otp_requests"("phone", "otp");

-- CreateIndex
CREATE INDEX "otp_requests_expiresAt_idx" ON "otp_requests"("expiresAt");

-- CreateIndex
CREATE INDEX "rate_limits_key_windowStart_idx" ON "rate_limits"("key", "windowStart");

-- CreateIndex
CREATE INDEX "rate_limits_expiresAt_idx" ON "rate_limits"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "rate_limits_key_windowStart_key" ON "rate_limits"("key", "windowStart");

-- CreateIndex
CREATE INDEX "user_capabilities_type_status_idx" ON "user_capabilities"("type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "user_capabilities_userId_type_key" ON "user_capabilities"("userId", "type");

-- CreateIndex
CREATE INDEX "self_operate_permissions_toolOwnerId_idx" ON "self_operate_permissions"("toolOwnerId");

-- CreateIndex
CREATE UNIQUE INDEX "self_operate_permissions_farmerId_toolOwnerId_key" ON "self_operate_permissions"("farmerId", "toolOwnerId");

-- CreateIndex
CREATE UNIQUE INDEX "tools_slug_key" ON "tools"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tool_instances_assetCode_key" ON "tool_instances"("assetCode");

-- CreateIndex
CREATE INDEX "tool_instances_toolId_status_idx" ON "tool_instances"("toolId", "status");

-- CreateIndex
CREATE INDEX "tool_instances_ownerId_idx" ON "tool_instances"("ownerId");

-- CreateIndex
CREATE INDEX "tool_instances_currentCustodianId_idx" ON "tool_instances"("currentCustodianId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderRef_key" ON "orders"("orderRef");

-- CreateIndex
CREATE INDEX "orders_userId_idx" ON "orders"("userId");

-- CreateIndex
CREATE INDEX "orders_paymentStatus_idx" ON "orders"("paymentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_bookingRef_key" ON "bookings"("bookingRef");

-- CreateIndex
CREATE INDEX "bookings_toolId_startDate_endDate_status_idx" ON "bookings"("toolId", "startDate", "endDate", "status");

-- CreateIndex
CREATE INDEX "bookings_toolInstanceId_startDate_endDate_idx" ON "bookings"("toolInstanceId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "bookings_farmerId_idx" ON "bookings"("farmerId");

-- CreateIndex
CREATE INDEX "bookings_toolOwnerId_idx" ON "bookings"("toolOwnerId");

-- CreateIndex
CREATE INDEX "bookings_servicePerformerId_idx" ON "bookings"("servicePerformerId");

-- CreateIndex
CREATE INDEX "bookings_orderId_idx" ON "bookings"("orderId");

-- CreateIndex
CREATE INDEX "handover_logs_bookingId_idx" ON "handover_logs"("bookingId");

-- CreateIndex
CREATE INDEX "handover_logs_toolInstanceId_idx" ON "handover_logs"("toolInstanceId");

-- CreateIndex
CREATE INDEX "handover_logs_actorId_idx" ON "handover_logs"("actorId");

-- CreateIndex
CREATE INDEX "booking_state_logs_bookingId_createdAt_idx" ON "booking_state_logs"("bookingId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "payments_bookingId_key" ON "payments"("bookingId");

-- CreateIndex
CREATE INDEX "payments_orderId_idx" ON "payments"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_userId_toolId_key" ON "reviews"("userId", "toolId");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_capabilities" ADD CONSTRAINT "user_capabilities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "self_operate_permissions" ADD CONSTRAINT "self_operate_permissions_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "self_operate_permissions" ADD CONSTRAINT "self_operate_permissions_toolOwnerId_fkey" FOREIGN KEY ("toolOwnerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_instances" ADD CONSTRAINT "tool_instances_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_instances" ADD CONSTRAINT "tool_instances_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_instances" ADD CONSTRAINT "tool_instances_currentCustodianId_fkey" FOREIGN KEY ("currentCustodianId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_toolOwnerId_fkey" FOREIGN KEY ("toolOwnerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_servicePerformerId_fkey" FOREIGN KEY ("servicePerformerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "tools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_toolInstanceId_fkey" FOREIGN KEY ("toolInstanceId") REFERENCES "tool_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handover_logs" ADD CONSTRAINT "handover_logs_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handover_logs" ADD CONSTRAINT "handover_logs_toolInstanceId_fkey" FOREIGN KEY ("toolInstanceId") REFERENCES "tool_instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handover_logs" ADD CONSTRAINT "handover_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_state_logs" ADD CONSTRAINT "booking_state_logs_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_state_logs" ADD CONSTRAINT "booking_state_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "tools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

