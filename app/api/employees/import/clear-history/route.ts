import db from "@/lib/prisma"
import { getServerUserId, unauthorizedResponse, validateCompanyAccess, forbiddenResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const { companyId } = await req.json()
        if (!companyId) {
            return NextResponse.json({ error: "ID da empresa ausente" }, { status: 400 })
        }

        const hasAccess = await validateCompanyAccess(userId, companyId)
        if (!hasAccess) return forbiddenResponse()

        const deleteResult = await db.import.deleteMany({
            where: { companyId }
        })

        return NextResponse.json({
            success: true,
            message: "Histórico de importações excluído com sucesso",
            count: deleteResult.count
        }, { status: 200 })
    } catch (error) {
        console.error("CLEAR IMPORT HISTORY ERROR:", error)
        return NextResponse.json({ error: "Erro interno ao limpar histórico" }, { status: 500 })
    }
}
