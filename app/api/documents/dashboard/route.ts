import db from "@/lib/prisma"
import { addDays, startOfDay } from "date-fns"
import { NextRequest, NextResponse } from "next/server"
import { getServerUserId, unauthorizedResponse, validateCompanyAccess, forbiddenResponse } from "@/lib/auth"

export async function POST(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const body = await req.json()
        const companyId = body.company_id

        const hasAccess = await validateCompanyAccess(userId, companyId)
        if (!hasAccess) return forbiddenResponse()

        const today = startOfDay(new Date())
        const next30Days = addDays(today, 30)

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
                where: { companyId: companyId, target: { in: ["EMPLOYEE_DOC", "EMPLOYEE_TRAINING"] }, isEnabled: true }
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

        const totalDocuments = mergedDocuments.length
        const approvedDocuments = mergedDocuments.filter(d => d.status === "APPROVED").length
        const pendingDocuments = mergedDocuments.filter(d => d.status === "PENDING").length
        const expiredDocuments = mergedDocuments.filter(d => d.status === "EXPIRED").length

        let expiringSoonDocuments = 0
        mergedDocuments.forEach(doc => {
            if (doc.expiresAt) {
                const expiresAt = new Date(doc.expiresAt)
                if (expiresAt >= today && expiresAt <= next30Days) {
                    expiringSoonDocuments++
                }
            }
        })

        return NextResponse.json({
            total: totalDocuments,
            pending: pendingDocuments,
            expired: expiredDocuments,
            expiring_soon: expiringSoonDocuments,
            approved: approvedDocuments
        })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'erro interno' }, { status: 500 })
    }
}