import db from "@/lib/prisma"
import { getServerUserId, unauthorizedResponse, validateCompanyAccess, forbiddenResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const { employeeId } = await req.json()

        if (!employeeId) {
            return NextResponse.json(
                { error: "ID do funcionário é obrigatório" },
                { status: 400 }
            )
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

        const emission = await db.passportEmission.create({
            data: {
                employeeId
            },
            include: {
                employee: true
            }
        })

        return NextResponse.json(emission, { status: 201 })
    } catch (error) {
        console.error("EMIT PASSPORT ERROR:", error)
        return NextResponse.json(
            { error: "Erro ao emitir passaporte" },
            { status: 500 }
        )
    }
}
