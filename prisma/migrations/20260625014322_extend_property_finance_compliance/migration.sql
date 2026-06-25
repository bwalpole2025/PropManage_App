-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "mobile" TEXT,
    "mobileVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "passwordHash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'owner',
    "numberOfPropertiesManaged" INTEGER NOT NULL DEFAULT 0,
    "totpSecret" TEXT,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthAccount" (
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

    CONSTRAINT "AuthAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "companyNumber" TEXT,
    "companyName" TEXT,
    "utr" TEXT,
    "vatRegistered" BOOLEAN NOT NULL DEFAULT false,
    "mtdEnrolled" BOOLEAN NOT NULL DEFAULT false,
    "principalUserId" TEXT NOT NULL,
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'trialing',
    "trialEndsAt" TIMESTAMP(3),
    "firstTaxYear" TEXT,
    "timeZone" TEXT NOT NULL DEFAULT 'Europe/London',
    "marketingOptIn" BOOLEAN NOT NULL DEFAULT false,
    "notificationPrefs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Portfolio" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'personal',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyNumber" TEXT,
    "utr" TEXT,
    "vatRegistered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VIEWER',
    "scope" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "inviteEmail" TEXT,
    "inviteToken" TEXT,
    "invitedByUserId" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BeneficialOwner" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'individual',
    "legalName" TEXT NOT NULL,
    "userId" TEXT,
    "companyId" TEXT,
    "portfolioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BeneficialOwner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "metadata" JSONB,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "postcode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'GB',
    "propertyType" TEXT NOT NULL DEFAULT 'FLAT',
    "bedrooms" INTEGER,
    "purchaseDate" TIMESTAMP(3),
    "purchasePricePence" INTEGER,
    "currentValuePence" INTEGER,
    "rentalIncomeAmountPence" INTEGER,
    "rentalIncomeFrequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "furnished" BOOLEAN,
    "isFHL" BOOLEAN NOT NULL DEFAULT false,
    "streetViewCameraPosition" JSONB,
    "epcRating" TEXT,
    "epcScore" INTEGER,
    "epcExpiryDate" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mortgage" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "lender" TEXT NOT NULL,
    "productType" TEXT NOT NULL DEFAULT 'FIXED',
    "accountNumberMasked" TEXT,
    "balancePence" INTEGER NOT NULL,
    "monthlyPaymentPence" INTEGER NOT NULL,
    "interestRateBp" INTEGER NOT NULL,
    "monthlyInterestPence" INTEGER,
    "fixedUntil" TIMESTAMP(3),
    "termMonths" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "startDate" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mortgage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Valuation" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "amountPence" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "source" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Valuation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "propertyId" TEXT,
    "tenantId" TEXT,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyOwnership" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "beneficialOwnerId" TEXT NOT NULL,
    "ownershipPercentageBp" INTEGER NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyOwnership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenancy" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isPeriodic" BOOLEAN NOT NULL DEFAULT false,
    "rentPence" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "rentFrequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "rentDueDay" INTEGER,
    "nextPaymentDate" TIMESTAMP(3),
    "depositPence" INTEGER,
    "depositScheme" TEXT,
    "depositRef" TEXT,
    "arrearsState" TEXT NOT NULL DEFAULT 'CURRENT',
    "balancePence" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenancy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "tenancyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "isLeadTenant" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "propertyId" TEXT,
    "tenancyId" TEXT,
    "direction" TEXT NOT NULL,
    "amountPence" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "date" TIMESTAMP(3) NOT NULL,
    "rentDueDate" TIMESTAMP(3),
    "description" TEXT NOT NULL,
    "merchant" TEXT,
    "category" TEXT,
    "subcategory" TEXT,
    "notes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "status" TEXT NOT NULL DEFAULT 'UNRECONCILED',
    "bankTransactionId" TEXT,
    "splitParentId" TEXT,
    "attachmentFileId" TEXT,
    "receiptDocumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentScheduleEntry" (
    "id" TEXT NOT NULL,
    "tenancyId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "expectedPence" INTEGER NOT NULL,
    "receivedPence" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DUE',
    "matchedTransactionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentScheduleEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArrearsAlert" (
    "id" TEXT NOT NULL,
    "tenancyId" TEXT NOT NULL,
    "rentScheduleEntryId" TEXT NOT NULL,
    "shortfallPence" INTEGER NOT NULL,
    "daysOverdue" INTEGER NOT NULL,
    "firstDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "ArrearsAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankConnection" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "providerConnectionId" TEXT NOT NULL,
    "institutionName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "accessTokenEnc" TEXT,
    "refreshTokenEnc" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "bankConnectionId" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortCode" TEXT,
    "accountNumberMasked" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankTransaction" (
    "id" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "providerTxnId" TEXT NOT NULL,
    "amountPence" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "rawCategory" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "propertyId" TEXT,
    "tenancyId" TEXT,
    "category" TEXT NOT NULL,
    "issuedDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "reference" TEXT,
    "fileId" TEXT,
    "reminderOffsetsDays" INTEGER[] DEFAULT ARRAY[30, 14, 7, 1]::INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentReminder" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "fireOn" TIMESTAMP(3) NOT NULL,
    "offsetDays" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "DocumentReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "propertyId" TEXT,
    "tenancyId" TEXT,
    "documentId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "kind" TEXT NOT NULL DEFAULT 'CUSTOM',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileObject" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "propertyId" TEXT,
    "tenancyId" TEXT,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "uploadedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileObject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxStatement" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "portfolioId" TEXT,
    "beneficialOwnerId" TEXT,
    "taxYearStart" TIMESTAMP(3) NOT NULL,
    "taxYearLabel" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "boxBreakdown" JSONB NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "totalIncomePence" INTEGER NOT NULL,
    "totalAllowableExpensesPence" INTEGER NOT NULL,
    "financeCostsPence" INTEGER NOT NULL DEFAULT 0,
    "financeCostTaxReductionPence" INTEGER NOT NULL DEFAULT 0,
    "propertyAllowanceUsedPence" INTEGER NOT NULL DEFAULT 0,
    "taxableProfitPence" INTEGER NOT NULL,
    "estimatedTaxPence" INTEGER,

    CONSTRAINT "TaxStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MtdConnection" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "hmrcUserId" TEXT,
    "accessTokenEnc" TEXT,
    "refreshTokenEnc" TEXT,
    "expiresAt" TIMESTAMP(3),
    "businessIncomeSourceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOT_CONNECTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MtdConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MtdObligation" (
    "id" TEXT NOT NULL,
    "mtdConnectionId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'QUARTERLY_UPDATE',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MtdObligation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MtdSubmission" (
    "id" TEXT NOT NULL,
    "mtdConnectionId" TEXT NOT NULL,
    "obligationId" TEXT,
    "type" TEXT NOT NULL,
    "periodKey" TEXT,
    "taxYearLabel" TEXT,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "hmrcReceiptId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "errorJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MtdSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_idx" ON "EmailVerificationToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthAccount_provider_providerAccountId_key" ON "AuthAccount"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "Account_principalUserId_idx" ON "Account"("principalUserId");

-- CreateIndex
CREATE INDEX "Portfolio_accountId_idx" ON "Portfolio"("accountId");

-- CreateIndex
CREATE INDEX "Company_accountId_idx" ON "Company"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_inviteToken_key" ON "Membership"("inviteToken");

-- CreateIndex
CREATE INDEX "Membership_accountId_idx" ON "Membership"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_accountId_key" ON "Membership"("userId", "accountId");

-- CreateIndex
CREATE INDEX "BeneficialOwner_accountId_idx" ON "BeneficialOwner"("accountId");

-- CreateIndex
CREATE INDEX "AuditLog_accountId_at_idx" ON "AuditLog"("accountId", "at");

-- CreateIndex
CREATE INDEX "Property_accountId_idx" ON "Property"("accountId");

-- CreateIndex
CREATE INDEX "Property_portfolioId_idx" ON "Property"("portfolioId");

-- CreateIndex
CREATE INDEX "Mortgage_accountId_idx" ON "Mortgage"("accountId");

-- CreateIndex
CREATE INDEX "Mortgage_propertyId_idx" ON "Mortgage"("propertyId");

-- CreateIndex
CREATE INDEX "Valuation_accountId_idx" ON "Valuation"("accountId");

-- CreateIndex
CREATE INDEX "Valuation_propertyId_date_idx" ON "Valuation"("propertyId", "date");

-- CreateIndex
CREATE INDEX "Note_accountId_idx" ON "Note"("accountId");

-- CreateIndex
CREATE INDEX "Note_propertyId_idx" ON "Note"("propertyId");

-- CreateIndex
CREATE INDEX "Note_tenantId_idx" ON "Note"("tenantId");

-- CreateIndex
CREATE INDEX "PropertyOwnership_propertyId_idx" ON "PropertyOwnership"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyOwnership_beneficialOwnerId_idx" ON "PropertyOwnership"("beneficialOwnerId");

-- CreateIndex
CREATE INDEX "Tenancy_propertyId_idx" ON "Tenancy"("propertyId");

-- CreateIndex
CREATE INDEX "Tenancy_propertyId_archivedAt_idx" ON "Tenancy"("propertyId", "archivedAt");

-- CreateIndex
CREATE INDEX "Tenant_tenancyId_idx" ON "Tenant"("tenancyId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_bankTransactionId_key" ON "Transaction"("bankTransactionId");

-- CreateIndex
CREATE INDEX "Transaction_accountId_date_idx" ON "Transaction"("accountId", "date");

-- CreateIndex
CREATE INDEX "Transaction_propertyId_idx" ON "Transaction"("propertyId");

-- CreateIndex
CREATE INDEX "Transaction_tenancyId_idx" ON "Transaction"("tenancyId");

-- CreateIndex
CREATE INDEX "RentScheduleEntry_tenancyId_idx" ON "RentScheduleEntry"("tenancyId");

-- CreateIndex
CREATE UNIQUE INDEX "RentScheduleEntry_tenancyId_dueDate_key" ON "RentScheduleEntry"("tenancyId", "dueDate");

-- CreateIndex
CREATE INDEX "ArrearsAlert_tenancyId_idx" ON "ArrearsAlert"("tenancyId");

-- CreateIndex
CREATE INDEX "BankConnection_accountId_idx" ON "BankConnection"("accountId");

-- CreateIndex
CREATE INDEX "BankAccount_bankConnectionId_idx" ON "BankAccount"("bankConnectionId");

-- CreateIndex
CREATE UNIQUE INDEX "BankTransaction_providerTxnId_key" ON "BankTransaction"("providerTxnId");

-- CreateIndex
CREATE INDEX "BankTransaction_bankAccountId_date_idx" ON "BankTransaction"("bankAccountId", "date");

-- CreateIndex
CREATE INDEX "Document_accountId_idx" ON "Document"("accountId");

-- CreateIndex
CREATE INDEX "Document_expiryDate_idx" ON "Document"("expiryDate");

-- CreateIndex
CREATE INDEX "DocumentReminder_documentId_idx" ON "DocumentReminder"("documentId");

-- CreateIndex
CREATE INDEX "DocumentReminder_fireOn_status_idx" ON "DocumentReminder"("fireOn", "status");

-- CreateIndex
CREATE INDEX "Reminder_accountId_dueDate_idx" ON "Reminder"("accountId", "dueDate");

-- CreateIndex
CREATE INDEX "Reminder_dueDate_status_idx" ON "Reminder"("dueDate", "status");

-- CreateIndex
CREATE INDEX "FileObject_accountId_idx" ON "FileObject"("accountId");

-- CreateIndex
CREATE INDEX "TaxStatement_accountId_idx" ON "TaxStatement"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "TaxStatement_accountId_portfolioId_beneficialOwnerId_taxYea_key" ON "TaxStatement"("accountId", "portfolioId", "beneficialOwnerId", "taxYearStart");

-- CreateIndex
CREATE UNIQUE INDEX "MtdConnection_accountId_key" ON "MtdConnection"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "MtdObligation_mtdConnectionId_periodKey_key" ON "MtdObligation"("mtdConnectionId", "periodKey");

-- CreateIndex
CREATE INDEX "MtdSubmission_mtdConnectionId_idx" ON "MtdSubmission"("mtdConnectionId");

-- AddForeignKey
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthAccount" ADD CONSTRAINT "AuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_principalUserId_fkey" FOREIGN KEY ("principalUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Portfolio" ADD CONSTRAINT "Portfolio_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Portfolio" ADD CONSTRAINT "Portfolio_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BeneficialOwner" ADD CONSTRAINT "BeneficialOwner_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BeneficialOwner" ADD CONSTRAINT "BeneficialOwner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BeneficialOwner" ADD CONSTRAINT "BeneficialOwner_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BeneficialOwner" ADD CONSTRAINT "BeneficialOwner_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mortgage" ADD CONSTRAINT "Mortgage_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mortgage" ADD CONSTRAINT "Mortgage_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Valuation" ADD CONSTRAINT "Valuation_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Valuation" ADD CONSTRAINT "Valuation_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyOwnership" ADD CONSTRAINT "PropertyOwnership_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyOwnership" ADD CONSTRAINT "PropertyOwnership_beneficialOwnerId_fkey" FOREIGN KEY ("beneficialOwnerId") REFERENCES "BeneficialOwner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenancy" ADD CONSTRAINT "Tenancy_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_bankTransactionId_fkey" FOREIGN KEY ("bankTransactionId") REFERENCES "BankTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_splitParentId_fkey" FOREIGN KEY ("splitParentId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_attachmentFileId_fkey" FOREIGN KEY ("attachmentFileId") REFERENCES "FileObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_receiptDocumentId_fkey" FOREIGN KEY ("receiptDocumentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentScheduleEntry" ADD CONSTRAINT "RentScheduleEntry_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArrearsAlert" ADD CONSTRAINT "ArrearsAlert_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArrearsAlert" ADD CONSTRAINT "ArrearsAlert_rentScheduleEntryId_fkey" FOREIGN KEY ("rentScheduleEntryId") REFERENCES "RentScheduleEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankConnection" ADD CONSTRAINT "BankConnection_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_bankConnectionId_fkey" FOREIGN KEY ("bankConnectionId") REFERENCES "BankConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentReminder" ADD CONSTRAINT "DocumentReminder_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileObject" ADD CONSTRAINT "FileObject_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileObject" ADD CONSTRAINT "FileObject_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileObject" ADD CONSTRAINT "FileObject_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxStatement" ADD CONSTRAINT "TaxStatement_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxStatement" ADD CONSTRAINT "TaxStatement_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxStatement" ADD CONSTRAINT "TaxStatement_beneficialOwnerId_fkey" FOREIGN KEY ("beneficialOwnerId") REFERENCES "BeneficialOwner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MtdConnection" ADD CONSTRAINT "MtdConnection_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MtdObligation" ADD CONSTRAINT "MtdObligation_mtdConnectionId_fkey" FOREIGN KEY ("mtdConnectionId") REFERENCES "MtdConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MtdSubmission" ADD CONSTRAINT "MtdSubmission_mtdConnectionId_fkey" FOREIGN KEY ("mtdConnectionId") REFERENCES "MtdConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MtdSubmission" ADD CONSTRAINT "MtdSubmission_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "MtdObligation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- One default ('Personal — Default') portfolio per account (partial unique index).
CREATE UNIQUE INDEX "Portfolio_one_default" ON "Portfolio"("accountId") WHERE "isDefault";
