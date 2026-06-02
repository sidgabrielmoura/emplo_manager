import db from "@/lib/prisma"
import { forbiddenResponse, getServerUserId, unauthorizedResponse, validateCompanyAccess } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const body = await req.json()
        const { id1, id2 } = body

        if (!id1 || !id2) {
            return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 })
        }

        const req1 = await db.companyRequiredDocument.findUnique({
            where: { id: id1 }
        })
        const req2 = await db.companyRequiredDocument.findUnique({
            where: { id: id2 }
        })

        if (!req1 || !req2) {
            return NextResponse.json({ error: "Documento padrão não encontrado" }, { status: 404 })
        }

        if (req1.companyId !== req2.companyId) {
            return NextResponse.json({ error: "Permissão negada" }, { status: 403 })
        }

        const hasAccess = await validateCompanyAccess(userId, req1.companyId)
        if (!hasAccess) return forbiddenResponse()

        const allReqs = await db.companyRequiredDocument.findMany({
            where: { companyId: req1.companyId, target: req1.target },
            orderBy: [
                { position: "asc" },
                { createdAt: "asc" }
            ]
        })

        const positions = allReqs.map(r => r.position)
        const hasDuplicatesOrZeros = positions.some(p => p === 0) || new Set(positions).size !== positions.length

        let finalReq1 = req1
        let finalReq2 = req2

        if (hasDuplicatesOrZeros) {
            await db.$transaction(
                allReqs.map((reqItem, idx) => 
                    db.companyRequiredDocument.update({
                        where: { id: reqItem.id },
                        data: { position: idx + 1 }
                    })
                )
            )

            const updatedReq1 = await db.companyRequiredDocument.findUnique({ where: { id: req1.id } })
            const updatedReq2 = await db.companyRequiredDocument.findUnique({ where: { id: req2.id } })
            if (updatedReq1) finalReq1 = updatedReq1
            if (updatedReq2) finalReq2 = updatedReq2
        }

        const tempPos = finalReq1.position
        await db.$transaction([
            db.companyRequiredDocument.update({
                where: { id: finalReq1.id },
                data: { position: finalReq2.position }
            }),
            db.companyRequiredDocument.update({
                where: { id: finalReq2.id },
                data: { position: tempPos }
            })
        ])

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error("SWAP REQUIRED DOCUMENTS ERROR:", error)
        return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500 })
    }
}
