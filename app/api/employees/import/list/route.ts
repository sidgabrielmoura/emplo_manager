import db from "@/lib/prisma"
import { getServerUserId, unauthorizedResponse, validateCompanyAccess, forbiddenResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const { companyId } = await req.json()
        if (!companyId) {
            return NextResponse.json(
                { error: "ID da empresa ausente" },
                { status: 400 }
            )
        }

        const hasAccess = await validateCompanyAccess(userId, companyId)
        if (!hasAccess) return forbiddenResponse()

        // Self-healing: mark stale imports (stuck for > 1 hour) as FAILED
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
        await db.import.updateMany({
            where: {
                companyId,
                status: { in: ["PENDING", "PROCESSING"] },
                iniciado_em: { lt: oneHourAgo }
            },
            data: {
                status: "FAILED"
            }
        }).catch(err => console.error("Self-healing import cleanup error:", err))

        const imports = await db.import.findMany({
            where: { companyId },
            orderBy: { iniciado_em: "desc" }
        })

        return NextResponse.json(imports, { status: 200 })
    } catch (error) {
        console.error("LIST IMPORTS ERROR:", error)
        return NextResponse.json(
            { error: "Erro interno" },
            { status: 500 }
        )
    }
}
