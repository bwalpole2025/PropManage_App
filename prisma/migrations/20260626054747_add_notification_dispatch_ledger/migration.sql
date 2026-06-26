-- CreateTable
CREATE TABLE "NotificationDispatch" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "dedupKey" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "channels" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationDispatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificationDispatch_accountId_idx" ON "NotificationDispatch"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationDispatch_accountId_dedupKey_key" ON "NotificationDispatch"("accountId", "dedupKey");

-- AddForeignKey
ALTER TABLE "NotificationDispatch" ADD CONSTRAINT "NotificationDispatch_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
