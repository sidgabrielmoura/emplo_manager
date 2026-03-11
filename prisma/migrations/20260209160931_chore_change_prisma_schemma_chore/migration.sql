/*
  Warnings:

  - You are about to drop the column `image_url` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `contractId` on the `Document` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[employeeId]` on the table `Contract` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[employeeId,type]` on the table `Document` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cpf]` on the table `Employee` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `Employee` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `imageUrl` to the `Company` table without a default value. This is not possible if the table is not empty.
  - Added the required column `birthDate` to the `Employee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email` to the `Employee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gender` to the `Employee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `position` to the `Employee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rg` to the `Employee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unity` to the `Employee` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "GenderEnum" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "RotationEnum" AS ENUM ('MORNING', 'AFTERNOON', 'NIGHT');

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_contractId_fkey";

-- DropIndex
DROP INDEX "Document_contractId_type_key";

-- AlterTable
ALTER TABLE "Company" DROP COLUMN "image_url",
ADD COLUMN     "imageUrl" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Document" DROP COLUMN "contractId",
ADD COLUMN     "employeeId" TEXT;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "birthDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "gender" "GenderEnum" NOT NULL,
ADD COLUMN     "position" TEXT NOT NULL,
ADD COLUMN     "registration" TEXT,
ADD COLUMN     "rg" TEXT NOT NULL,
ADD COLUMN     "rotation" "RotationEnum",
ADD COLUMN     "supervisor" TEXT,
ADD COLUMN     "unity" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Contract_employeeId_key" ON "Contract"("employeeId");

-- CreateIndex
CREATE INDEX "Document_employeeId_idx" ON "Document"("employeeId");

-- CreateIndex
CREATE INDEX "Document_status_idx" ON "Document"("status");

-- CreateIndex
CREATE INDEX "Document_expiresAt_idx" ON "Document"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Document_employeeId_type_key" ON "Document"("employeeId", "type");

-- CreateIndex
CREATE INDEX "Employee_companyId_idx" ON "Employee"("companyId");

-- CreateIndex
CREATE INDEX "Employee_status_idx" ON "Employee"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_cpf_key" ON "Employee"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE INDEX "User_companyId_idx" ON "User"("companyId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
