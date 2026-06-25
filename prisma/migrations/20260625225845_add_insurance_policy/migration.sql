-- CreateTable
CREATE TABLE "InsurancePolicy" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'LANDLORD_LIABILITY',
    "provider" TEXT NOT NULL,
    "policyNumber" TEXT,
    "expiryDate" TIMESTAMP(3),
    "premiumPence" INTEGER,
    "premiumFrequency" TEXT NOT NULL DEFAULT 'ANNUALLY',
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsurancePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InsurancePolicy_accountId_idx" ON "InsurancePolicy"("accountId");

-- CreateIndex
CREATE INDEX "InsurancePolicy_propertyId_idx" ON "InsurancePolicy"("propertyId");

-- AddForeignKey
ALTER TABLE "InsurancePolicy" ADD CONSTRAINT "InsurancePolicy_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsurancePolicy" ADD CONSTRAINT "InsurancePolicy_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
