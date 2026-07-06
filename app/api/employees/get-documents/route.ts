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

        const [documents, requirements] = await Promise.all([
            db.document.findMany({
                where: { employeeId: employeeId, deletedAt: null },
                orderBy: [
                    { position: "asc" },
                    { createdAt: "asc" }
                ]
            }),
            db.companyRequiredDocument.findMany({
                where: { companyId: employee.companyId, target: "EMPLOYEE_DOC", isEnabled: true },
                orderBy: [
                    { position: "asc" },
                    { createdAt: "asc" }
                ]
            })
        ])

        // Normalize employee documents positions in database if any is 0 or duplicates exist
        const docPositions = documents.map(d => d.position)
        const hasDocZeroOrDuplicates = docPositions.some(p => p === 0) || new Set(docPositions).size !== docPositions.length
        if (hasDocZeroOrDuplicates && documents.length > 0) {
            await db.$transaction(
                documents.map((doc, idx) =>
                    db.document.update({
                        where: { id: doc.id },
                        data: { position: idx + 1 }
                    })
                )
            )
            // Re-fetch documents
            documents.length = 0
            documents.push(...(await db.document.findMany({
                where: { employeeId: employeeId, deletedAt: null },
                orderBy: [
                    { position: "asc" },
                    { createdAt: "asc" }
                ]
            })))
        }

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
            // Re-fetch requirements
            requirements.length = 0
            requirements.push(...(await db.companyRequiredDocument.findMany({
                where: { companyId: employee.companyId, target: "EMPLOYEE_DOC", isEnabled: true },
                orderBy: [
                    { position: "asc" },
                    { createdAt: "asc" }
                ]
            })))
        }

        const mergedDocuments = [...documents]

        requirements.forEach(req => {
            const exists = documents.find(d => d.type === "CUSTOM" && d.name === req.name)
            if (!exists) {
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

        mergedDocuments.sort((a, b) => {
            const posA = a.position ?? 0
            const posB = b.position ?? 0
            if (posA !== posB) return posA - posB
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        })

        return NextResponse.json(mergedDocuments)
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}