import db from "@/lib/prisma"
import { forbiddenResponse, getServerUserId, unauthorizedResponse, validateCompanyAccess } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { validateSpyAction } from "@/lib/spy-guard"
import { deleteR2Files } from "@/lib/r2"

export async function POST(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const body = await req.json()
        const { employeeId, ids, stage } = body

        if (!employeeId || !ids || !Array.isArray(ids)) {
            return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 })
        }

        const employee = await db.employee.findUnique({
            where: { id: employeeId },
            select: { companyId: true }
        })

        if (!employee) {
            return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 })
        }

        const hasAccess = await validateCompanyAccess(userId, employee.companyId)
        if (!hasAccess) return forbiddenResponse()

        // Spy validation
        const spyValidation = await validateSpyAction(req, "documents", "edit", { employeeId })
        if (!spyValidation.authorized) {
            return NextResponse.json({ error: spyValidation.reason || "Não autorizado" }, { status: 403 })
        }

        const realIds = ids.filter((id: string) => !id.startsWith("virtual-"))
        const virtualIds = ids.filter((id: string) => id.startsWith("virtual-"))

        if (stage === "attachment") {
            // Estágio 1: apenas remover o arquivo anexado e zerar dados, mantendo a linha
            if (realIds.length > 0) {
                const docs = await db.document.findMany({
                    where: { id: { in: realIds }, employeeId },
                    select: { id: true, fileUrl: true }
                })
                const fileUrls = docs.map(d => d.fileUrl).filter(Boolean)
                if (fileUrls.length > 0) {
                    await deleteR2Files(fileUrls)
                }

                await db.document.updateMany({
                    where: { id: { in: realIds }, employeeId },
                    data: {
                        fileUrl: null,
                        issuedAt: null,
                        expiresAt: null,
                        status: "PENDING"
                    }
                })
            }
        } else {
            // Estágio 2 (ou padrão para deleção completa de linha): remover completamente a linha
            // 1. Para documentos reais já existentes no banco
            if (realIds.length > 0) {
                const docs = await db.document.findMany({
                    where: { id: { in: realIds }, employeeId },
                    select: { id: true, fileUrl: true }
                })
                const fileUrls = docs.map(d => d.fileUrl).filter(Boolean)
                if (fileUrls.length > 0) {
                    await deleteR2Files(fileUrls)
                }

                await db.document.updateMany({
                    where: { id: { in: realIds }, employeeId },
                    data: {
                        deletedAt: new Date(),
                        fileUrl: null
                    }
                })
            }

            // 2. Para documentos virtuais (requisitos da empresa que ainda não têm registro com deletedAt no banco do funcionário)
            if (virtualIds.length > 0) {
                const reqIds = virtualIds.map((id: string) => id.replace("virtual-", ""))
                const requirements = await db.companyRequiredDocument.findMany({
                    where: { id: { in: reqIds }, companyId: employee.companyId }
                })

                for (const req of requirements) {
                    await db.document.upsert({
                        where: {
                            employeeId_type_name: {
                                employeeId,
                                type: "CUSTOM",
                                name: req.name
                            }
                        },
                        update: {
                            deletedAt: new Date(),
                            fileUrl: null,
                            status: "PENDING"
                        },
                        create: {
                            employeeId,
                            type: "CUSTOM",
                            name: req.name,
                            deletedAt: new Date(),
                            status: "PENDING",
                            position: req.position
                        }
                    })
                }
            }
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error("DELETE DOCUMENTS ERROR:", error)
        return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500 })
    }
}
