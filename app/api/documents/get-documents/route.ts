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

        const documents = await db.document.findMany({
            where: {
                employee: {
                    companyId: companyId
                },
                deletedAt: null
            },
            include: {
                employee: true
            },
            orderBy: {
                updatedAt: "desc",
            }
        })

        return NextResponse.json(documents)
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'erro interno' }, { status: 500 })
    }
}