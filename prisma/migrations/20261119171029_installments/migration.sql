-- AlterTable
ALTER TABLE "Expense" ADD COLUMN "installmentCount" INTEGER;
ALTER TABLE "Expense" ADD COLUMN "installmentGroup" TEXT;
ALTER TABLE "Expense" ADD COLUMN "installmentNumber" INTEGER;

-- CreateTable
CREATE TABLE "RepairInstallment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "repairId" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "amount" INTEGER NOT NULL,
    CONSTRAINT "RepairInstallment_repairId_fkey" FOREIGN KEY ("repairId") REFERENCES "Repair" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "RepairInstallment_date_idx" ON "RepairInstallment"("date");

-- CreateIndex
CREATE INDEX "RepairInstallment_repairId_idx" ON "RepairInstallment"("repairId");

-- CreateIndex
CREATE INDEX "Expense_installmentGroup_idx" ON "Expense"("installmentGroup");
