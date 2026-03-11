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

        if (!companyId) {
            return NextResponse.json({ error: 'ID da empresa não informado' }, { status: 400 })
        }

        const hasAccess = await validateCompanyAccess(userId, companyId)
        if (!hasAccess) return forbiddenResponse()

        const today = startOfDay(new Date())
        const next30Days = addDays(today, 30)

        const [
            totalDocuments,
            approvedDocuments,
            pendingDocuments,
            expiredDocuments,
            expiringSoonDocuments
        ] = await Promise.all([
            db.companyDocument.count({
                where: {
                    companyId: companyId
                }
            }),
            db.companyDocument.count({
                where: {
                    companyId: companyId,
                    status: "APPROVED"
                }
            }),
            db.companyDocument.count({
                where: {
                    companyId: companyId,
                    status: "PENDING"
                }
            }),
            db.companyDocument.count({
                where: {
                    companyId: companyId,
                    status: "EXPIRED"
                }
            }),
            db.companyDocument.count({
                where: {
                    companyId: companyId,
                    expiresAt: {
                        gte: today,
                        lte: next30Days
                    }
                }
            })
        ])

        return NextResponse.json({
            total: totalDocuments,
            pending: pendingDocuments,
            expired: expiredDocuments,
            expiring_soon: expiringSoonDocuments,
            approved: approvedDocuments
        })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Erro interno ao buscar estatísticas dos documentos' }, { status: 500 })
    }
}
