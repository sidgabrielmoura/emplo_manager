import db from "@/lib/prisma"
import { forbiddenResponse, getServerUserId, unauthorizedResponse, validateCompanyAccess } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { updateExpiredStatuses } from "@/lib/docs"

export async function POST(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const body = await req.json()
        const employeeId = body.employee_id

        const employee = await db.employee.findUnique({
            where: { id: employeeId },
            select: {
                companyId: true,
                company: { select: { disabledDocuments: true } }
            }
        })

        if (!employee) {
            return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 })
        }

        const hasAccess = await validateCompanyAccess(userId, employee.companyId)
        if (!hasAccess) return forbiddenResponse()

        await updateExpiredStatuses(employee.companyId)

        const [documents, requirements] = await Promise.all([
            db.document.findMany({
                where: { employeeId: employeeId, deletedAt: null },
                orderBy: { updatedAt: "desc" }
            }),
            db.companyRequiredDocument.findMany({
                where: { companyId: employee.companyId, target: "EMPLOYEE_DOC", isEnabled: true }
            })
        ])

        // Keep all real documents belonging to this employee.
        // We do not filter them out even if they aren't in the global required checklist,
        // because the admin can add specific documents for this specific employee.
        const mergedDocuments = [...documents]

        // Add virtual documents for any required documents that don't exist in the database yet
        requirements.forEach(req => {
            const exists = documents.find(d => d.type === "CUSTOM" && d.name === req.name)
            if (!exists) {
                mergedDocuments.push({
                    id: `virtual-${req.id}`,
                    type: "CUSTOM",
                    name: req.name,
                    status: "PENDING",
                    fileUrl: null,
                    issuedAt: null,
                    expiresAt: null,
                    employeeId: employeeId,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    deletedAt: null,
                    isEnabled: true // Defaults to enabled
                } as any)
            }
        })

        return NextResponse.json(mergedDocuments)
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}