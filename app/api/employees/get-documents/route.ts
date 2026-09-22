import db from "@/lib/prisma"
import { forbiddenResponse, getServerUserId, unauthorizedResponse, validateCompanyAccess } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { updateExpiredStatuses } from "@/lib/docs"
import { validateSpyAction } from "@/lib/spy-guard"

export async function POST(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const body = await req.json()
        const employeeId = body.employee_id

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

        const hasAccess = await validateCompanyAccess(userId, employee.companyId)
        if (!hasAccess) return forbiddenResponse()

        // Spy validation: check if the cost center is authorized.
        const spyValidation = await validateSpyAction(req, "documents", "view", { employeeId })
        if (!spyValidation.authorized) {
            return NextResponse.json({ error: spyValidation.reason || "Não autorizado" }, { status: 403 })
        }

        await updateExpiredStatuses(employee.companyId)

        const [documents, deletedDocuments, requirements] = await Promise.all([
            db.document.findMany({
                where: { employeeId: employeeId, deletedAt: null },
                orderBy: [
                    { position: "asc" },
                    { createdAt: "asc" }
                ]
            }),
            db.document.findMany({
                where: { employeeId: employeeId, deletedAt: { not: null } },
                select: { name: true, type: true }
            }),
            db.companyRequiredDocument.findMany({
                where: { companyId: employee.companyId, target: "EMPLOYEE_DOC", isEnabled: true },
                orderBy: [
                    { position: "asc" },
                    { createdAt: "asc" }
                ]
            })
        ])

        // Normalize company required documents positions in database if any is 0 or duplicates exist
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

        // Map document position to matching requirement position if doc.position is 0
        documents.forEach(doc => {
            if (!doc.position || doc.position <= 0) {
                const req = requirements.find(r => r.name === doc.name)
                if (req && req.position > 0) {
                    doc.position = req.position
                }
            }
        })

        const mergedDocuments = [...documents]

        requirements.forEach(req => {
            const exists = documents.find(d => d.type === "CUSTOM" && d.name === req.name)
            const wasDeleted = deletedDocuments.some(d => d.type === "CUSTOM" && d.name === req.name)
            if (!exists && !wasDeleted) {
                mergedDocuments.push({
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
        mergedDocuments.sort((a, b) => {
            const posA = a.position ?? 0
            const posB = b.position ?? 0
            if (posA !== posB) return posA - posB
            const nameComp = (a.name || "").localeCompare(b.name || "", "pt-BR")
            if (nameComp !== 0) return nameComp
            return (a.id || "").localeCompare(b.id || "")
        })

        // Ensure 1-based sequential positions (1..N) and persist DB docs if position changed
        const updatesToPersist: Promise<any>[] = []
        mergedDocuments.forEach((item, idx) => {
            const correctPosition = idx + 1
            if (item.position !== correctPosition) {
                item.position = correctPosition
                if (!item.id.startsWith("virtual-")) {
                    updatesToPersist.push(
                        db.document.update({
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

        return NextResponse.json(mergedDocuments)
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}