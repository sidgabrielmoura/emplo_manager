-- CreateTable
CREATE TABLE "PassportEmission" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PassportEmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PassportEmission_employeeId_idx" ON "PassportEmission"("employeeId");

-- CreateIndex
CREATE INDEX "PassportEmission_issuedAt_idx" ON "PassportEmission"("issuedAt");

-- AddForeignKey
ALTER TABLE "PassportEmission" ADD CONSTRAINT "PassportEmission_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
