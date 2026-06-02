import db from "@/lib/prisma"
import { forbiddenResponse, getServerUserId, unauthorizedResponse, validateCompanyAccess } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const body = await req.json()
        const { employeeId, id1, id2 } = body

        if (!employeeId || !id1 || !id2) {
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

        const getOrUpsertTraining = async (trainingId: string) => {
            if (trainingId.startsWith("virtual-")) {
                const reqId = trainingId.replace("virtual-", "")
                const requirement = await db.companyRequiredDocument.findUnique({
                    where: { id: reqId }
                })
                if (!requirement) throw new Error("Requisito não encontrado")

                const existing = await db.training.findUnique({
                    where: {
                        employeeId_type_name: {
                            employeeId,
                            type: "CUSTOM",
                            name: requirement.name
                        }
                    }
                })

                if (existing) return existing

                return await db.training.create({
                    data: {
                        employeeId,
                        type: "CUSTOM",
                        name: requirement.name,
                        status: "PENDING",
                        isEnabled: true,
                        position: requirement.position
                    }
                })
            }

            const training = await db.training.findUnique({
                where: { id: trainingId }
            })
            if (!training) throw new Error("Treinamento não encontrado")
            return training
        }

        const training1 = await getOrUpsertTraining(id1)
        const training2 = await getOrUpsertTraining(id2)

        const allTrainings = await db.training.findMany({
            where: { employeeId, deletedAt: null },
            orderBy: [
                { position: "asc" },
                { createdAt: "asc" }
            ]
        })

        const positions = allTrainings.map(t => t.position)
        const hasDuplicatesOrZeros = positions.some(p => p === 0) || new Set(positions).size !== positions.length

        let finalTraining1 = training1
        let finalTraining2 = training2

        if (hasDuplicatesOrZeros) {
            await db.$transaction(
                allTrainings.map((t, idx) => 
                    db.training.update({
                        where: { id: t.id },
                        data: { position: idx + 1 }
                    })
                )
            )

            const updatedTraining1 = await db.training.findUnique({ where: { id: training1.id } })
            const updatedTraining2 = await db.training.findUnique({ where: { id: training2.id } })
            if (updatedTraining1) finalTraining1 = updatedTraining1
            if (updatedTraining2) finalTraining2 = updatedTraining2
        }

        const tempPos = finalTraining1.position
        await db.$transaction([
            db.training.update({
                where: { id: finalTraining1.id },
                data: { position: finalTraining2.position }
            }),
            db.training.update({
                where: { id: finalTraining2.id },
                data: { position: tempPos }
            })
        ])

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error("SWAP TRAININGS ERROR:", error)
        return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500 })
    }
}
