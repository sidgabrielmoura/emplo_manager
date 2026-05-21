import db from "@/lib/prisma"
import { forbiddenResponse, getServerUserId, unauthorizedResponse, validateCompanyAccess } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

export async function PUT(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const body = await req.json()
        const { employeeId, documentId, isEnabled } = body

        if (!employeeId || !documentId || isEnabled === undefined) {
            return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 })
        }

        const isVirtual = documentId.startsWith("virtual-")

        if (isVirtual) {
            const requirementId = documentId.replace("virtual-", "")
            const requirement = await db.companyRequiredDocument.findUnique({
                where: { id: requirementId }
            })

            if (!requirement) {
                return NextResponse.json({ error: "Documento padrão não encontrado" }, { status: 404 })
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

            // Upsert the document with the targeted isEnabled status
            const doc = await db.document.upsert({
                where: {
                    employeeId_type_name: {
                        employeeId,
                        type: "CUSTOM",
                        name: requirement.name
                    }
                },
                update: {
                    isEnabled,
                    deletedAt: null
                },
                create: {
                    employeeId,
                    type: "CUSTOM",
                    name: requirement.name,
                    status: "PENDING",
                    isEnabled
                }
            })

            return NextResponse.json(doc)
        }

        // For actual database documents
        const document = await db.document.findUnique({
            where: { id: documentId },
            include: { employee: { select: { companyId: true } } }
        })

        if (!document || !document.employee) {
            return NextResponse.json({ error: "Documento ou funcionário não encontrado" }, { status: 404 })
        }

        const hasAccess = await validateCompanyAccess(userId, document.employee.companyId)
        if (!hasAccess) return forbiddenResponse()

        const updatedDoc = await db.document.update({
            where: { id: documentId },
            data: {
                isEnabled
            }
        })

        return NextResponse.json(updatedDoc)
    } catch (error) {
        console.error("TOGGLE DOCUMENT STATUS ERROR:", error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}
