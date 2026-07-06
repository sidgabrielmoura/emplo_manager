import db from "@/lib/prisma"
import { forbiddenResponse, getServerUserId, unauthorizedResponse, validateCompanyAccess } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { validateSpyAction } from "@/lib/spy-guard"

export async function POST(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const body = await req.json()
        const { employeeId, ids } = body

        if (!employeeId || !ids || !Array.isArray(ids)) {
            return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 })
        }

        const employee = await db.employee.findUnique({
            where: { id: employeeId },
            select: { companyId: true }
        })

        if (!employee) {
            return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 })
        }

        const hasAccess = await validateCompanyAccess(userId, employee.companyId)
        if (!hasAccess) return forbiddenResponse()

        // Spy validation
        const spyValidation = await validateSpyAction(req, "documents", "edit", { employeeId })
        if (!spyValidation.authorized) {
            return NextResponse.json({ error: spyValidation.reason || "Não autorizado" }, { status: 403 })
        }

        const realIds = ids.filter(id => !id.startsWith("virtual-"))

        if (realIds.length > 0) {
            await db.document.deleteMany({
                where: {
                    id: { in: realIds },
                    employeeId: employeeId
                }
            })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error("DELETE DOCUMENTS ERROR:", error)
        return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500 })
    }
}
