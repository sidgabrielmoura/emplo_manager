import db from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { TrainingType } from "@/lib/generated/prisma/enums"
import { getServerUserId, unauthorizedResponse, validateCompanyAccess, forbiddenResponse } from "@/lib/auth"

function parseDateOnly(date: string) {
    const [year, month, day] = date.split("-").map(Number)
    return new Date(Date.UTC(year, month - 1, day))
}

export async function POST(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const body = await req.json()

        if (!body.employeeId || !body.type) {
            return NextResponse.json({ error: 'Dados obrigatórios ausentes' }, { status: 400 })
        }

        const employee = await db.employee.findUnique({
            where: { id: body.employeeId },
            select: { companyId: true }
        })

        if (!employee) {
            return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 })
        }

        const hasAccess = await validateCompanyAccess(userId, employee.companyId)
        if (!hasAccess) return forbiddenResponse()

        const training = await db.training.create({
            data: {
                employeeId: body.employeeId,
                type: body.type as TrainingType,
                status: body.status || 'PENDING',
                fileUrl: body.fileUrl || null,
                issuedAt: body.issuedAt ? parseDateOnly(body.issuedAt) : null,
                expiresAt: body.expiresAt ? parseDateOnly(body.expiresAt) : null,
            }
        })

        return NextResponse.json(training)
    } catch (error) {
        console.error("CREATE TRAINING ERROR:", error)
        return NextResponse.json({ error: 'Erro ao criar treinamento' }, { status: 500 })
    }
}
