import db from "@/lib/prisma"
import { getServerUserId, unauthorizedResponse, validateCompanyAccess, forbiddenResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

function parseDateOnly(date: string) {
    const [year, month, day] = date.split("-").map(Number)
    return new Date(Date.UTC(year, month - 1, day))
}

export async function PUT(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const body = await req.json()
        const trainingId = body.id

        const trainingData = await db.training.findUnique({
            where: { id: trainingId },
            include: { employee: { select: { companyId: true } } }
        })

        if (!trainingData || !trainingData.employee) {
            return NextResponse.json({ error: "Treinamento ou funcionário não encontrado" }, { status: 404 })
        }

        const hasAccess = await validateCompanyAccess(userId, trainingData.employee.companyId)
        if (!hasAccess) return forbiddenResponse()

        const training = await db.training.update({
            where: { id: trainingId },
            data: {
                status: body.status || 'APPROVED',
                fileUrl: body.fileUrl,
                issuedAt: body.issuedAt ? parseDateOnly(body.issuedAt) : null,
                expiresAt: body.expiresAt ? parseDateOnly(body.expiresAt) : null,
            }
        })

        return NextResponse.json(training)
    } catch (error) {
        console.error("UPDATE TRAINING ERROR:", error)
        return NextResponse.json({ error: 'Erro ao atualizar treinamento' }, { status: 500 })
    }
}
