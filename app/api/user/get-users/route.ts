import db from "@/lib/prisma"
import { getServerUserId, unauthorizedResponse, validateCompanyAccess, forbiddenResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const { company_id } = await req.json()

        const hasAccess = await validateCompanyAccess(userId, company_id)
        if (!hasAccess) return forbiddenResponse()

        const response = await db.user.findMany({
            where: {
                companyId: company_id
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true
            }
        })

        return NextResponse.json(response, { status: 200 })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'erro interno' }, { status: 500 })
    }
}