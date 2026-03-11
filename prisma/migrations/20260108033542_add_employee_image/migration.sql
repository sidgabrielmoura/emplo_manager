/*
  Warnings:

  - Added the required column `image` to the `Employee` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "image" TEXT NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
