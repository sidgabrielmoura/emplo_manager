/*
  Warnings:

  - You are about to drop the column `deletedAt` on the `Employee` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "deletedAt",
ADD COLUMN     "dismissedAt" TIMESTAMP(3);
