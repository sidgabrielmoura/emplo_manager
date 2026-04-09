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

        // 1. Filter real documents to exclude orphans (CUSTOM documents without active requirement)
        const activeRealDocs = documents.filter(doc => {
            if (doc.type !== "CUSTOM") return true;
            return requirements.some(req => req.name === doc.name);
        });

        const mergedDocuments = [...activeRealDocs]

        // 2. Add virtual placeholders
        requirements.forEach(req => {
            const exists = activeRealDocs.find(d => d.type === "CUSTOM" && d.name === req.name)
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
                    deletedAt: null
                } as any)
            }
        })

        return NextResponse.json(mergedDocuments)
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}