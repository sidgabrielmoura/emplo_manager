import db from "@/lib/prisma"
import { forbiddenResponse, getServerUserId, unauthorizedResponse, validateCompanyAccess } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const body = await req.json()
        const { employeeId, id1, id2, pos1, pos2 } = body

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

        const getOrUpsertDocument = async (docId: string, fallbackPos?: number) => {
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

                const initialPosition = fallbackPos && fallbackPos > 0 
                    ? fallbackPos 
                    : (requirement.position > 0 ? requirement.position : 1)

                return await db.document.create({
                    data: {
                        employeeId,
                        type: "CUSTOM",
                        name: requirement.name,
                        status: "PENDING",
                        isEnabled: true,
                        position: initialPosition
                    }
                })
            }

            const doc = await db.document.findUnique({
                where: { id: docId }
            })
            if (!doc) throw new Error("Documento não encontrado")
            return doc
        }

        const doc1 = await getOrUpsertDocument(id1, pos1)
        const doc2 = await getOrUpsertDocument(id2, pos2)

        const p1 = typeof pos1 === "number" && pos1 > 0 ? pos1 : doc1.position
        const p2 = typeof pos2 === "number" && pos2 > 0 ? pos2 : doc2.position

        await db.$transaction([
            db.document.update({
                where: { id: doc1.id },
                data: { position: p2 }
            }),
            db.document.update({
                where: { id: doc2.id },
                data: { position: p1 }
            })
        ])

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error("SWAP DOCUMENTS ERROR:", error)
        return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500 })
    }
}
