import db from "@/lib/prisma"
import { getServerUserId, unauthorizedResponse, validateCompanyAccess, forbiddenResponse, getSessionUser } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { validateSpyAction } from "@/lib/spy-guard"

export async function POST(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const { companyId } = await req.json()

        if (!companyId) {
            return NextResponse.json(
                { error: "ID da empresa é obrigatório" },
                { status: 400 }
            )
        }

        const hasAccess = await validateCompanyAccess(userId, companyId)
        if (!hasAccess) return forbiddenResponse()

        const currentUser = await getSessionUser(req)
        const isSpy = currentUser?.role === "ESPIAO"
        const spyCcIds = (currentUser as any)?.costCenters || []

        const whereClause: any = {
            employee: {
                companyId
            }
        }

        if (isSpy) {
            whereClause.employee.costCenterId = { in: spyCcIds }
        }

        const emissions = await db.passportEmission.findMany({
            where: whereClause,
            include: {
                employee: true
            },
            orderBy: {
                issuedAt: 'desc'
            }
        })

        return NextResponse.json(emissions, { status: 200 })
    } catch (error) {
        console.error("GET PASSPORT HISTORY ERROR:", error)
        return NextResponse.json(
            { error: "Erro ao buscar histórico de emissões" },
            { status: 500 }
        )
    }
}
