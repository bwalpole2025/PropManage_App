-- CreateTable
CREATE TABLE "DocumentCustomCategory" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentCustomCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentCustomCategory_accountId_idx" ON "DocumentCustomCategory"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentCustomCategory_accountId_name_key" ON "DocumentCustomCategory"("accountId", "name");

-- AddForeignKey
ALTER TABLE "DocumentCustomCategory" ADD CONSTRAINT "DocumentCustomCategory_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
