-- CreateEnum
CREATE TYPE "SkipReason" AS ENUM ('SHOP_CLOSED', 'OWNER_UNAVAILABLE', 'PAYMENT_DISPUTE', 'OTHER');

-- CreateTable
CREATE TABLE "SkippedVisit" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "salesmanId" TEXT NOT NULL,
    "routeId" TEXT,
    "reason" "SkipReason" NOT NULL,
    "notes" TEXT,
    "skippedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkippedVisit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SkippedVisit_organizationId_isResolved_idx" ON "SkippedVisit"("organizationId", "isResolved");

-- CreateIndex
CREATE INDEX "SkippedVisit_organizationId_skippedDate_idx" ON "SkippedVisit"("organizationId", "skippedDate");

-- CreateIndex
CREATE INDEX "SkippedVisit_shopId_idx" ON "SkippedVisit"("shopId");

-- AddForeignKey
ALTER TABLE "SkippedVisit" ADD CONSTRAINT "SkippedVisit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkippedVisit" ADD CONSTRAINT "SkippedVisit_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkippedVisit" ADD CONSTRAINT "SkippedVisit_salesmanId_fkey" FOREIGN KEY ("salesmanId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkippedVisit" ADD CONSTRAINT "SkippedVisit_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE SET NULL ON UPDATE CASCADE;
