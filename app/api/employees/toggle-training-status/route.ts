import db from "@/lib/prisma"
import { forbiddenResponse, getServerUserId, unauthorizedResponse, validateCompanyAccess } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

export async function PUT(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const body = await req.json()
        const { employeeId, trainingId, isEnabled, position } = body

        if (!employeeId || !trainingId || isEnabled === undefined) {
            return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 })
        }

        const isVirtual = trainingId.startsWith("virtual-")

        if (isVirtual) {
            const requirementId = trainingId.replace("virtual-", "")
            const requirement = await db.companyRequiredDocument.findUnique({
                where: { id: requirementId }
            })

            if (!requirement) {
                return NextResponse.json({ error: "Treinamento padrão não encontrado" }, { status: 404 })
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

            let targetPosition = typeof position === "number" && position > 0 ? position : (requirement.position > 0 ? requirement.position : 0)
            if (targetPosition <= 0) {
                const maxTraining = await db.training.findFirst({
                    where: { employeeId, deletedAt: null },
                    orderBy: { position: "desc" },
                    select: { position: true }
                })
                targetPosition = (maxTraining?.position ?? 0) + 1
            }

            // Upsert the training with the targeted isEnabled status and preserve position
            const training = await db.training.upsert({
                where: {
                    employeeId_type_name: {
                        employeeId,
                        type: "CUSTOM",
                        name: requirement.name
                    }
                },
                update: {
                    isEnabled,
                    deletedAt: null,
                    ...(targetPosition > 0 ? { position: targetPosition } : {})
                },
                create: {
                    employeeId,
                    type: "CUSTOM",
                    name: requirement.name,
                    status: "PENDING",
                    isEnabled,
                    position: targetPosition
                }
            })

            return NextResponse.json(training)
        }

        // For actual database trainings
        const training = await db.training.findUnique({
            where: { id: trainingId },
            include: { employee: { select: { companyId: true } } }
        })

        if (!training || !training.employee) {
            return NextResponse.json({ error: "Treinamento ou funcionário não encontrado" }, { status: 404 })
        }

        const hasAccess = await validateCompanyAccess(userId, training.employee.companyId)
        if (!hasAccess) return forbiddenResponse()

        const updateData: any = { isEnabled }
        if (typeof position === "number" && position > 0) {
            updateData.position = position
        } else if (!training.position || training.position <= 0) {
            const req = await db.companyRequiredDocument.findFirst({
                where: { companyId: training.employee.companyId, name: training.name || "", target: "EMPLOYEE_TRAINING" },
                select: { position: true }
            })
            if (req?.position && req.position > 0) {
                updateData.position = req.position
            }
        }

        const updatedTraining = await db.training.update({
            where: { id: trainingId },
            data: updateData
        })

        return NextResponse.json(updatedTraining)
    } catch (error) {
        console.error("TOGGLE TRAINING STATUS ERROR:", error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}
