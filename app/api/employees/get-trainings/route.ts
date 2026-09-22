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
 
        const [trainings, deletedTrainings, requirements] = await Promise.all([
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
            db.training.findMany({
                where: {
                    employeeId: employeeId,
                    deletedAt: { not: null }
                },
                select: { name: true, type: true }
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
            requirements.forEach((req, idx) => {
                req.position = idx + 1
            })
        }

        // Map training position to matching requirement position if training.position is 0
        trainings.forEach(t => {
            if (!t.position || t.position <= 0) {
                const req = requirements.find(r => r.name === t.name)
                if (req && req.position > 0) {
                    t.position = req.position
                }
            }
        })
 
        const mergedTrainings = [...trainings]

        requirements.forEach(req => {
            const exists = trainings.find(t => t.type === "CUSTOM" && t.name === req.name)
            const wasDeleted = deletedTrainings.some(t => t.type === "CUSTOM" && t.name === req.name)
            if (!exists && !wasDeleted) {
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

        // Sort deterministically: primary by position, secondary by name (never by createdAt)
        mergedTrainings.sort((a, b) => {
            const posA = a.position ?? 0
            const posB = b.position ?? 0
            if (posA !== posB) return posA - posB
            const nameComp = (a.name || "").localeCompare(b.name || "", "pt-BR")
            if (nameComp !== 0) return nameComp
            return (a.id || "").localeCompare(b.id || "")
        })

        // Ensure 1-based sequential positions (1..N) and persist DB trainings if position changed
        const updatesToPersist: Promise<any>[] = []
        mergedTrainings.forEach((item, idx) => {
            const correctPosition = idx + 1
            if (item.position !== correctPosition) {
                item.position = correctPosition
                if (!item.id.startsWith("virtual-")) {
                    updatesToPersist.push(
                        db.training.update({
                            where: { id: item.id },
                            data: { position: correctPosition }
                        })
                    )
                }
            }
        })

        if (updatesToPersist.length > 0) {
            await Promise.all(updatesToPersist)
        }

        return NextResponse.json(mergedTrainings)
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
