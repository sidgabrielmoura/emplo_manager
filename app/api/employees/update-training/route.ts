import db from "@/lib/prisma"
import { getServerUserId, unauthorizedResponse, validateCompanyAccess, forbiddenResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { calculateDocumentDates } from "@/lib/docs"


export async function PUT(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const body = await req.json()
        const trainingId = body.id

        if (!body.fileUrl) {
            return NextResponse.json({ error: 'url do arquivo não encontrada' }, { status: 400 })
        }

        const isVirtual = trainingId && trainingId.startsWith('virtual-')

        if (isVirtual) {
            const requirementId = trainingId.replace('virtual-', '')
            const requirement = await db.companyRequiredDocument.findUnique({
                where: { id: requirementId }
            })

            if (!requirement) {
                return NextResponse.json({ error: "Requisito não encontrado" }, { status: 404 })
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

            const { issuedAt, expiresAt } = await calculateDocumentDates({
                companyId: employee.companyId,
                type: 'CUSTOM',
                name: requirement.name,
                requirementId: requirementId
            })

            const response = await db.training.upsert({
                where: {
                    employeeId_type_name: {
                        employeeId: body.employeeId,
                        type: 'CUSTOM',
                        name: requirement.name
                    }
                },
                update: {
                    fileUrl: body.fileUrl,
                    expiresAt,
                    issuedAt,
                    status: body.status || 'APPROVED',
                    deletedAt: null
                },
                create: {
                    employeeId: body.employeeId,
                    type: 'CUSTOM',
                    name: requirement.name,
                    fileUrl: body.fileUrl,
                    expiresAt,
                    issuedAt,
                    status: body.status || 'APPROVED'
                }
            })

            return NextResponse.json(response)
        }

        const trainingData = await db.training.findUnique({
            where: { id: trainingId },
            include: { employee: { select: { companyId: true } } }
        })

        if (!trainingData || !trainingData.employee) {
            return NextResponse.json({ error: "Treinamento ou funcionário não encontrado" }, { status: 404 })
        }

        const hasAccess = await validateCompanyAccess(userId, trainingData.employee.companyId)
        if (!hasAccess) return forbiddenResponse()

        const { issuedAt, expiresAt } = await calculateDocumentDates({
            companyId: trainingData.employee.companyId,
            type: (trainingData as any).type,
            name: (trainingData as any).name
        })

        const training = await db.training.update({
            where: { id: trainingId },
            data: {
                status: body.status || 'APPROVED',
                fileUrl: body.fileUrl,
                issuedAt,
                expiresAt,
                deletedAt: null
            }
        })

        return NextResponse.json(training)
    } catch (error) {
        console.error("UPDATE TRAINING ERROR:", error)
        return NextResponse.json({ error: 'Erro ao atualizar treinamento' }, { status: 500 })
    }
}
