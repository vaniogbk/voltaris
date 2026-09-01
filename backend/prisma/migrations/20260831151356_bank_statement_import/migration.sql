-- CreateEnum
CREATE TYPE "BankEntryStatus" AS ENUM ('MATCHED', 'AMOUNT_MISMATCH', 'ALREADY_PAID', 'UNMATCHED', 'IGNORED');

-- CreateTable
CREATE TABLE "BankStatement" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "accountIban" TEXT,
    "externalId" TEXT,
    "fromDate" TIMESTAMP(3),
    "toDate" TIMESTAMP(3),
    "creditCount" INTEGER NOT NULL DEFAULT 0,
    "importedCount" INTEGER NOT NULL DEFAULT 0,
    "matchedCount" INTEGER NOT NULL DEFAULT 0,
    "importedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankStatementEntry" (
    "id" TEXT NOT NULL,
    "statementId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "bankReference" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "bookedAt" TIMESTAMP(3) NOT NULL,
    "valueDate" TIMESTAMP(3),
    "debtorName" TEXT,
    "debtorIban" TEXT,
    "remittance" TEXT,
    "status" "BankEntryStatus" NOT NULL,
    "orderId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankStatementEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BankStatement_createdAt_idx" ON "BankStatement"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BankStatementEntry_fingerprint_key" ON "BankStatementEntry"("fingerprint");

-- CreateIndex
CREATE INDEX "BankStatementEntry_statementId_idx" ON "BankStatementEntry"("statementId");

-- CreateIndex
CREATE INDEX "BankStatementEntry_status_idx" ON "BankStatementEntry"("status");

-- CreateIndex
CREATE INDEX "BankStatementEntry_orderId_idx" ON "BankStatementEntry"("orderId");

-- CreateIndex
CREATE INDEX "BankStatementEntry_bookedAt_idx" ON "BankStatementEntry"("bookedAt");

-- AddForeignKey
ALTER TABLE "BankStatement" ADD CONSTRAINT "BankStatement_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatementEntry" ADD CONSTRAINT "BankStatementEntry_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "BankStatement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatementEntry" ADD CONSTRAINT "BankStatementEntry_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
