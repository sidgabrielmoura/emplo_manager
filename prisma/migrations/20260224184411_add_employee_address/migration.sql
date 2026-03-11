-- CreateTable
CREATE TABLE "EmployeeContact" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "phone" TEXT,
    "emergencyContact" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeAddress" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "cep" TEXT,
    "address" TEXT,
    "number" TEXT,
    "district" TEXT,
    "city" TEXT,
    "complement" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeAddress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeContact_employeeId_key" ON "EmployeeContact"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeAddress_employeeId_key" ON "EmployeeAddress"("employeeId");

-- AddForeignKey
ALTER TABLE "EmployeeContact" ADD CONSTRAINT "EmployeeContact_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAddress" ADD CONSTRAINT "EmployeeAddress_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
