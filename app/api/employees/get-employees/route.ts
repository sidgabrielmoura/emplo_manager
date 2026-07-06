import db from "@/lib/prisma"
import { getServerUserId, unauthorizedResponse, validateCompanyAccess, forbiddenResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { validateSpyAction } from "@/lib/spy-guard"

export async function POST(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const { companyId } = await req.json()
        if (!companyId) {
            return NextResponse.json({ error: "ID da empresa é obrigatório" }, { status: 400 })
        }

        const hasAccess = await validateCompanyAccess(userId, companyId)
        if (!hasAccess) return forbiddenResponse()

        // Spy validation
        const spyValidation = await validateSpyAction(req, "employees", "view")
        const isSpy = spyValidation.isSpy
        const spyCcIds = spyValidation.costCenters || []

        if (!spyValidation.authorized) {
            return NextResponse.json({ error: spyValidation.reason || "Não autorizado" }, { status: 403 })
        }

        const whereClause: any = { companyId }
        if (isSpy && spyCcIds.length > 0) {
            whereClause.costCenterId = { in: spyCcIds }
        }

        const response = await db.employee.findMany({
            where: whereClause,
            include: {
                costCenter: true
            }
        })

        return NextResponse.json(response, { status: 200 })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}