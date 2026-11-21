-- AlterTable users
ALTER TABLE "users" ALTER COLUMN "phone" DROP NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "firebaseUid" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_firebaseUid_key" ON "users"("firebaseUid");

-- AlterTable tools
ALTER TABLE "tools" ADD COLUMN IF NOT EXISTS "minAllowedPricePerDay" INTEGER DEFAULT 30000;
ALTER TABLE "tools" ADD COLUMN IF NOT EXISTS "maxAllowedPricePerDay" INTEGER DEFAULT 300000;

-- AlterTable tool_instances
ALTER TABLE "tool_instances" ADD COLUMN IF NOT EXISTS "pricePerDay" INTEGER;
ALTER TABLE "tool_instances" ADD COLUMN IF NOT EXISTS "deposit" INTEGER;
ALTER TABLE "tool_instances" ADD COLUMN IF NOT EXISTS "images" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "tool_instances" ADD COLUMN IF NOT EXISTS "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'VERIFIED';
ALTER TABLE "tool_instances" ADD COLUMN IF NOT EXISTS "adminReviewNotes" TEXT;
ALTER TABLE "tool_instances" ADD COLUMN IF NOT EXISTS "rating" DOUBLE PRECISION NOT NULL DEFAULT 4.8;
ALTER TABLE "tool_instances" ADD COLUMN IF NOT EXISTS "reviewCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "tool_instances" ADD COLUMN IF NOT EXISTS "conditionGrade" TEXT NOT NULL DEFAULT 'GOOD';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tool_instances_toolId_verificationStatus_status_idx" ON "tool_instances"("toolId", "verificationStatus", "status");
