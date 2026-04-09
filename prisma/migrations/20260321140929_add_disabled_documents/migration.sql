-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "disabledDocuments" TEXT[] DEFAULT ARRAY[]::TEXT[];
