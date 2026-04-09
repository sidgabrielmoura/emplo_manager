/*
  Warnings:

  - A unique constraint covering the columns `[companyId,type,name]` on the table `CompanyDocument` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[employeeId,type,name]` on the table `Document` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "DocumentTarget" AS ENUM ('EMPLOYEE', 'COMPANY');

-- AlterEnum
ALTER TYPE "CompanyDocumentType" ADD VALUE 'CUSTOM';

-- AlterEnum
ALTER TYPE "DocumentType" ADD VALUE 'CUSTOM';

-- DropIndex
DROP INDEX "CompanyDocument_companyId_type_key";

-- DropIndex
DROP INDEX "Document_employeeId_type_key";

-- AlterTable
ALTER TABLE "CompanyDocument" ADD COLUMN     "name" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "name" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "CompanyRequiredDocument" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "target" "DocumentTarget" NOT NULL DEFAULT 'EMPLOYEE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyRequiredDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyRequiredDocument_companyId_idx" ON "CompanyRequiredDocument"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyRequiredDocument_companyId_name_target_key" ON "CompanyRequiredDocument"("companyId", "name", "target");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyDocument_companyId_type_name_key" ON "CompanyDocument"("companyId", "type", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Document_employeeId_type_name_key" ON "Document"("employeeId", "type", "name");

-- AddForeignKey
ALTER TABLE "CompanyRequiredDocument" ADD CONSTRAINT "CompanyRequiredDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
