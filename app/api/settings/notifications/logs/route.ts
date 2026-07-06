import db from "@/lib/prisma"
import { getServerUserId, unauthorizedResponse, validateCompanyAccess, forbiddenResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const { searchParams } = new URL(req.url)
        const companyId = searchParams.get("companyId")
        if (!companyId) {
            return NextResponse.json({ error: "ID da empresa ausente" }, { status: 400 })
        }

        const hasAccess = await validateCompanyAccess(userId, companyId)
        if (!hasAccess) return forbiddenResponse()

        const logs = await db.emailLog.findMany({
            where: { companyId },
            orderBy: { sentAt: "desc" }
        })

        return NextResponse.json(logs, { status: 200 })
    } catch (error) {
        console.error("GET EMAIL LOGS ERROR:", error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}
