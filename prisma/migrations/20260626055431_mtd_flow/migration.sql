-- AlterTable
ALTER TABLE "MtdConnection" ADD COLUMN     "deviceId" TEXT,
ADD COLUMN     "nino" TEXT,
ADD COLUMN     "oauthState" TEXT;

-- AlterTable
ALTER TABLE "MtdSubmission" ADD COLUMN     "calculationId" TEXT,
ADD COLUMN     "receiptJson" JSONB,
ADD COLUMN     "submittedByMembershipId" TEXT,
ADD COLUMN     "submittedByUserId" TEXT;

-- CreateTable
CREATE TABLE "MtdCalculation" (
    "id" TEXT NOT NULL,
    "mtdConnectionId" TEXT NOT NULL,
    "taxYearLabel" TEXT NOT NULL,
    "calculationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "kind" TEXT NOT NULL DEFAULT 'estimate',
    "totalIncomePence" INTEGER,
    "totalAllowancesAndDeductionsPence" INTEGER,
    "totalTaxableIncomePence" INTEGER,
    "incomeTaxAndNicsDuePence" INTEGER,
    "resultJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MtdCalculation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MtdCalculation_calculationId_key" ON "MtdCalculation"("calculationId");

-- CreateIndex
CREATE INDEX "MtdCalculation_mtdConnectionId_taxYearLabel_idx" ON "MtdCalculation"("mtdConnectionId", "taxYearLabel");

-- AddForeignKey
ALTER TABLE "MtdCalculation" ADD CONSTRAINT "MtdCalculation_mtdConnectionId_fkey" FOREIGN KEY ("mtdConnectionId") REFERENCES "MtdConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
