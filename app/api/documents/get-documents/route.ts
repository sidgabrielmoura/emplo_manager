import db from "@/lib/prisma"
import { getServerUserId, unauthorizedResponse, validateCompanyAccess, forbiddenResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const body = await req.json()
        const companyId = body.company_id

        const hasAccess = await validateCompanyAccess(userId, companyId)
        if (!hasAccess) return forbiddenResponse()

        const [documents, company, requirements, employees] = await Promise.all([
            db.document.findMany({
                where: {
                    employee: { companyId: companyId },
                    deletedAt: null
                },
                include: { employee: true },
                orderBy: { updatedAt: "desc" }
            }),
            db.company.findUnique({
                where: { id: companyId },
                select: { disabledDocuments: true }
            }),
            db.companyRequiredDocument.findMany({
                where: { companyId: companyId, target: "EMPLOYEE_DOC", isEnabled: true }
            }),
            db.employee.findMany({
                where: { companyId: companyId, status: "ACTIVE" }
            })
        ])

        const disabledDocs = (company?.disabledDocuments as string[]) || []

        
        const activeRealDocs = documents.filter(doc => {
            if (doc.type !== "CUSTOM") {
                return !disabledDocs.includes(doc.type)
            }
            return requirements.some(req => req.name === doc.name)
        })

        const mergedDocuments = [...activeRealDocs]

        
        employees.forEach(emp => {
            requirements.forEach(req => {
                const exists = activeRealDocs.find(
                    d => d.type === "CUSTOM" && d.name === req.name && d.employeeId === emp.id
                )
                if (!exists) {
                    mergedDocuments.push({
                        id: `virtual-${emp.id}-${req.id}`,
                        type: "CUSTOM",
                        name: req.name,
                        status: "PENDING",
                        fileUrl: null,
                        issuedAt: null,
                        expiresAt: null,
                        employeeId: emp.id,
                        employee: emp,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        deletedAt: null
                    } as any)
                }
            })
        })

        return NextResponse.json(mergedDocuments)
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'erro interno' }, { status: 500 })
    }
}