-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "prsdId" TEXT,
ADD COLUMN     "prsdRegisteredDate" TIMESTAMP(3),
ADD COLUMN     "prsdStatus" TEXT DEFAULT 'NOT_REGISTERED';

-- AlterTable
ALTER TABLE "Tenancy" ADD COLUMN     "agreementType" TEXT NOT NULL DEFAULT 'ASSURED_PERIODIC',
ADD COLUMN     "depositProtectedDate" TIMESTAMP(3),
ADD COLUMN     "depositReceivedDate" TIMESTAMP(3),
ADD COLUMN     "prescribedInfoServedDate" TIMESTAMP(3),
ADD COLUMN     "rentInAdvancePence" INTEGER;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "rightToRentExpiry" TIMESTAMP(3),
ADD COLUMN     "rightToRentStatus" TEXT;

-- CreateTable
CREATE TABLE "RentIncreaseNotice" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "tenancyId" TEXT NOT NULL,
    "noticeServedDate" TIMESTAMP(3) NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "previousRentPence" INTEGER NOT NULL,
    "proposedRentPence" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SERVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentIncreaseNotice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HazardReport" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "tenancyId" TEXT,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "reportedDate" TIMESTAMP(3) NOT NULL,
    "reportedBy" TEXT,
    "description" TEXT NOT NULL,
    "investigateByDate" TIMESTAMP(3),
    "repairStartByDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'REPORTED',
    "investigatedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HazardReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HazardEvent" (
    "id" TEXT NOT NULL,
    "hazardReportId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "note" TEXT,
    "byUserId" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HazardEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PetRequest" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "tenancyId" TEXT NOT NULL,
    "requestedDate" TIMESTAMP(3) NOT NULL,
    "petDescription" TEXT NOT NULL,
    "responseDeadline" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "decidedAt" TIMESTAMP(3),
    "decisionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PetRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandlordRegistration" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "ombudsmanScheme" TEXT,
    "ombudsmanRef" TEXT,
    "ombudsmanRenewalDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'NOT_REGISTERED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandlordRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RentIncreaseNotice_accountId_idx" ON "RentIncreaseNotice"("accountId");

-- CreateIndex
CREATE INDEX "RentIncreaseNotice_tenancyId_effectiveDate_idx" ON "RentIncreaseNotice"("tenancyId", "effectiveDate");

-- CreateIndex
CREATE INDEX "HazardReport_accountId_idx" ON "HazardReport"("accountId");

-- CreateIndex
CREATE INDEX "HazardReport_propertyId_idx" ON "HazardReport"("propertyId");

-- CreateIndex
CREATE INDEX "HazardReport_status_idx" ON "HazardReport"("status");

-- CreateIndex
CREATE INDEX "HazardEvent_hazardReportId_idx" ON "HazardEvent"("hazardReportId");

-- CreateIndex
CREATE INDEX "PetRequest_accountId_idx" ON "PetRequest"("accountId");

-- CreateIndex
CREATE INDEX "PetRequest_tenancyId_idx" ON "PetRequest"("tenancyId");

-- CreateIndex
CREATE UNIQUE INDEX "LandlordRegistration_accountId_key" ON "LandlordRegistration"("accountId");

-- AddForeignKey
ALTER TABLE "RentIncreaseNotice" ADD CONSTRAINT "RentIncreaseNotice_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentIncreaseNotice" ADD CONSTRAINT "RentIncreaseNotice_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HazardReport" ADD CONSTRAINT "HazardReport_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HazardReport" ADD CONSTRAINT "HazardReport_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HazardReport" ADD CONSTRAINT "HazardReport_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HazardEvent" ADD CONSTRAINT "HazardEvent_hazardReportId_fkey" FOREIGN KEY ("hazardReportId") REFERENCES "HazardReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetRequest" ADD CONSTRAINT "PetRequest_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetRequest" ADD CONSTRAINT "PetRequest_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandlordRegistration" ADD CONSTRAINT "LandlordRegistration_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
