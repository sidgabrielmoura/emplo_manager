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

        const getOrUpsertDocument = async (docId: string) => {
            if (docId.startsWith("virtual-")) {
                const reqId = docId.replace("virtual-", "")
                const requirement = await db.companyRequiredDocument.findUnique({
                    where: { id: reqId }
                })
                if (!requirement) throw new Error("Requisito não encontrado")

                const existing = await db.document.findUnique({
                    where: {
                        employeeId_type_name: {
                            employeeId,
                            type: "CUSTOM",
                            name: requirement.name
                        }
                    }
                })

                if (existing) return existing

                return await db.document.create({
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

            const doc = await db.document.findUnique({
                where: { id: docId }
            })
            if (!doc) throw new Error("Documento não encontrado")
            return doc
        }

        const doc1 = await getOrUpsertDocument(id1)
        const doc2 = await getOrUpsertDocument(id2)

        const allDocs = await db.document.findMany({
            where: { employeeId, deletedAt: null },
            orderBy: [
                { position: "asc" },
                { createdAt: "asc" }
            ]
        })

        const positions = allDocs.map(d => d.position)
        const hasDuplicatesOrZeros = positions.some(p => p === 0) || new Set(positions).size !== positions.length

        let finalDoc1 = doc1
        let finalDoc2 = doc2

        if (hasDuplicatesOrZeros) {
            await db.$transaction(
                allDocs.map((doc, idx) => 
                    db.document.update({
                        where: { id: doc.id },
                        data: { position: idx + 1 }
                    })
                )
            )

            const updatedDoc1 = await db.document.findUnique({ where: { id: doc1.id } })
            const updatedDoc2 = await db.document.findUnique({ where: { id: doc2.id } })
            if (updatedDoc1) finalDoc1 = updatedDoc1
            if (updatedDoc2) finalDoc2 = updatedDoc2
        }

        const tempPos = finalDoc1.position
        await db.$transaction([
            db.document.update({
                where: { id: finalDoc1.id },
                data: { position: finalDoc2.position }
            }),
            db.document.update({
                where: { id: finalDoc2.id },
                data: { position: tempPos }
            })
        ])

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error("SWAP DOCUMENTS ERROR:", error)
        return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500 })
    }
}
