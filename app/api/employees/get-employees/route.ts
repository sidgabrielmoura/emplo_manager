import db from "@/lib/prisma"
import { getServerUserId, unauthorizedResponse, validateCompanyAccess, forbiddenResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const { companyId } = await req.json()

        const hasAccess = await validateCompanyAccess(userId, companyId)
        if (!hasAccess) return forbiddenResponse()

        const response = await db.employee.findMany({
            where: {
                companyId
            }
        })

        return NextResponse.json(response, { status: 200 })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}