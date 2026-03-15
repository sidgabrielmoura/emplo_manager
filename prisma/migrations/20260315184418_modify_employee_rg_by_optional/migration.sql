-- CreateEnum
CREATE TYPE "CompanyDocumentType" AS ENUM ('CNPJ_SOCIAL_CONTRACT', 'PGR_COMPANY', 'PCMSO_COMPANY', 'ALVARA_LOCALIZACAO', 'AET_ERGONOMICA', 'LICENCA_AMBIENTAL', 'LTCAT', 'NR15_INSALUBRIDADE', 'NR16_PERICULOSIDADE', 'PCA_AUDITIVA', 'PPR_RESPIRATORIA', 'PGR_CPFL', 'PCMSO_CPFL', 'CRF_FGTS', 'GUIA_FGTS_DIGITAL', 'GUIA_DARF_PREVIDENCIARIO', 'CND_DIVIDA_ATIVA_UNIAO', 'FOLHA_PAGAMENTO_RESUMO', 'COMPROVANTE_PAGAMENTO_SALARIO', 'CONVENCAO_COLETIVA', 'ESPELHO_DE_PONTO', 'DECLARACAO_DCTFWEB', 'DECLARACAO_ALOCACAO', 'DECLARACAO_DEMITIDOS_ESOCIAL', 'DECLARACAO_MENSAL_FERIAS', 'RECIBO_FERIAS_PAGAMENTO', 'CND_DEBITOS_TRABALHISTAS', 'GUIA_DAS_PAGAMENTO');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "cnpj" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "responsible" TEXT,
ADD COLUMN     "state" TEXT;

-- AlterTable
ALTER TABLE "Employee" ALTER COLUMN "rg" DROP NOT NULL;

-- CreateTable
CREATE TABLE "CompanyDocument" (
    "id" TEXT NOT NULL,
    "type" "CompanyDocumentType" NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "fileUrl" TEXT,
    "issuedAt" DATE,
    "expiresAt" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "companyId" TEXT NOT NULL,

    CONSTRAINT "CompanyDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyDocument_companyId_idx" ON "CompanyDocument"("companyId");

-- CreateIndex
CREATE INDEX "CompanyDocument_status_idx" ON "CompanyDocument"("status");

-- CreateIndex
CREATE INDEX "CompanyDocument_expiresAt_idx" ON "CompanyDocument"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyDocument_companyId_type_key" ON "CompanyDocument"("companyId", "type");

-- AddForeignKey
ALTER TABLE "CompanyDocument" ADD CONSTRAINT "CompanyDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
