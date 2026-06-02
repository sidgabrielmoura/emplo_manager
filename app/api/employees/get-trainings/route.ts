import db from "@/lib/prisma"
import { getServerUserId, unauthorizedResponse, validateCompanyAccess, forbiddenResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { updateExpiredStatuses } from "@/lib/docs"

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const employeeId = body.employee_id

        if (!employeeId) {
            return NextResponse.json({ error: "employee_id é obrigatório" }, { status: 400 })
        }

        const employee = await db.employee.findUnique({
            where: { id: employeeId },
            select: { 
                companyId: true,
                company: { select: { disabledDocuments: true } }
            }
        })
 
        if (!employee) {
            return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 })
        }
 
  
 
        
        await updateExpiredStatuses(employee.companyId)
 
        const [trainings, requirements] = await Promise.all([
            db.training.findMany({
                where: {
                    employeeId: employeeId,
                    deletedAt: null
                },
                orderBy: [
                    { position: "asc" },
                    { createdAt: "asc" }
                ]
            }),
            db.companyRequiredDocument.findMany({
                where: {
                    companyId: employee.companyId,
                    target: "EMPLOYEE_TRAINING",
                    isEnabled: true
                },
                orderBy: [
                    { position: "asc" },
                    { createdAt: "asc" }
                ]
            })
        ])

        // Normalize employee trainings positions in database if any is 0 or duplicates exist
        const trainingPositions = trainings.map(t => t.position)
        const hasTrainingZeroOrDuplicates = trainingPositions.some(p => p === 0) || new Set(trainingPositions).size !== trainingPositions.length
        if (hasTrainingZeroOrDuplicates && trainings.length > 0) {
            await db.$transaction(
                trainings.map((t, idx) =>
                    db.training.update({
                        where: { id: t.id },
                        data: { position: idx + 1 }
                    })
                )
            )
            // Re-fetch trainings
            trainings.length = 0
            trainings.push(...(await db.training.findMany({
                where: { employeeId: employeeId, deletedAt: null },
                orderBy: [
                    { position: "asc" },
                    { createdAt: "asc" }
                ]
            })))
        }

        // Normalize company required trainings positions in database if any is 0 or duplicates exist
        const reqPositions = requirements.map(r => r.position)
        const hasReqZeroOrDuplicates = reqPositions.some(p => p === 0) || new Set(reqPositions).size !== reqPositions.length
        if (hasReqZeroOrDuplicates && requirements.length > 0) {
            await db.$transaction(
                requirements.map((req, idx) =>
                    db.companyRequiredDocument.update({
                        where: { id: req.id },
                        data: { position: idx + 1 }
                    })
                )
            )
            // Re-fetch requirements
            requirements.length = 0
            requirements.push(...(await db.companyRequiredDocument.findMany({
                where: { companyId: employee.companyId, target: "EMPLOYEE_TRAINING", isEnabled: true },
                orderBy: [
                    { position: "asc" },
                    { createdAt: "asc" }
                ]
            })))
        }
 
        const mergedTrainings = [...trainings]

        requirements.forEach(req => {
            const exists = trainings.find(t => t.type === "CUSTOM" && t.name === req.name)
            if (!exists) {
                mergedTrainings.push({
                    id: `virtual-${req.id}`,
                    type: "CUSTOM",
                    name: req.name,
                    status: "PENDING",
                    fileUrl: null,
                    issuedAt: null,
                    expiresAt: null,
                    employeeId: employeeId,
                    createdAt: req.createdAt,
                    updatedAt: req.updatedAt,
                    deletedAt: null,
                    isEnabled: true,
                    position: req.position
                } as any)
            }
        })

        mergedTrainings.sort((a, b) => {
            const posA = a.position ?? 0
            const posB = b.position ?? 0
            if (posA !== posB) return posA - posB
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        })

        return NextResponse.json(mergedTrainings)
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
