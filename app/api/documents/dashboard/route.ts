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

        const [
            totalDocuments,
            approvedDocuments,
            pendingDocuments,
            expiredDocuments,
            expiringSoonDocuments
        ] = await Promise.all([
            db.document.count({
                where: {
                    employee: {
                        companyId: companyId
                    }
                }
            }),
            db.document.count({
                where: {
                    employee: {
                        companyId: companyId
                    },
                    status: "APPROVED"
                }
            }),
            db.document.count({
                where: {
                    employee: {
                        companyId: companyId
                    },
                    status: "PENDING"
                }
            }),
            db.document.count({
                where: {
                    employee: {
                        companyId: companyId
                    },
                    status: "EXPIRED"
                }
            }),
            db.document.count({
                where: {
                    employee: {
                        companyId: companyId
                    },
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
        return NextResponse.json({ error: 'erro interno' }, { status: 500 })
    }
}