import db from "@/lib/prisma"
import { forbiddenResponse, getServerUserId, unauthorizedResponse, validateCompanyAccess } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const body = await req.json()
        const { employeeId, name } = body

        if (!employeeId || !name || !name.trim()) {
            return NextResponse.json({ error: "Funcionário e nome do documento são obrigatórios" }, { status: 400 })
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

        const docName = name.trim()

        // Check if a document with this name already exists for this employee
        const existingDoc = await db.document.findUnique({
            where: {
                employeeId_type_name: {
                    employeeId,
                    type: "CUSTOM",
                    name: docName
                }
            }
        })

        if (existingDoc) {
            if (existingDoc.deletedAt !== null) {
                const maxDoc = await db.document.findFirst({
                    where: { employeeId, deletedAt: null },
                    orderBy: { position: "desc" },
                    select: { position: true }
                })
                const nextPosition = maxDoc ? maxDoc.position + 1 : 1

                // Restore deleted document
                const restoredDoc = await db.document.update({
                    where: { id: existingDoc.id },
                    data: {
                        deletedAt: null,
                        isEnabled: true,
                        status: "PENDING",
                        position: nextPosition
                    }
                })
                return NextResponse.json(restoredDoc)
            }

            return NextResponse.json({ error: "Este documento já está adicionado para este funcionário" }, { status: 400 })
        }

        const maxDoc = await db.document.findFirst({
            where: { employeeId, deletedAt: null },
            orderBy: { position: "desc" },
            select: { position: true }
        })
        const nextPosition = maxDoc ? maxDoc.position + 1 : 1

        const newDoc = await db.document.create({
            data: {
                employeeId,
                type: "CUSTOM",
                name: docName,
                status: "PENDING",
                isEnabled: true,
                position: nextPosition
            }
        })

        return NextResponse.json(newDoc)
    } catch (error) {
        console.error("ADD DOCUMENT ERROR:", error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}
