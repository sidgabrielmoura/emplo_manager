import db from "@/lib/prisma"
import { getServerUserId, unauthorizedResponse, validateCompanyAccess, forbiddenResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

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

        const documents = await db.companyDocument.findMany({
            where: {
                companyId: companyId
            },
            orderBy: {
                updatedAt: "desc",
            }
        })

        return NextResponse.json(documents)
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Erro interno ao buscar documentos da empresa' }, { status: 500 })
    }
}
