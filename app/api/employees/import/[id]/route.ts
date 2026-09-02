import db from "@/lib/prisma"
import { getServerUserId, unauthorizedResponse, validateCompanyAccess, forbiddenResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const params = await props.params
        const importId = parseInt(params.id, 10)
        if (isNaN(importId)) {
            return NextResponse.json(
                { error: "ID de importação inválido" },
                { status: 400 }
            )
        }

        const importData = await db.import.findUnique({
            where: { id: importId },
            include: {
                items: {
                    orderBy: {
                        linha_planilha: "asc"
                    }
                }
            }
        })

        if (!importData) {
            return NextResponse.json(
                { error: "Importação não encontrada" },
                { status: 404 }
            )
        }

        const hasAccess = await validateCompanyAccess(userId, importData.companyId)
        if (!hasAccess) return forbiddenResponse()

        return NextResponse.json(importData, { status: 200 })
    } catch (error) {
        console.error("GET IMPORT DETAILS ERROR:", error)
        return NextResponse.json(
            { error: "Erro interno" },
            { status: 500 }
        )
    }
}

export async function DELETE(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const params = await props.params
        const importId = parseInt(params.id, 10)
        if (isNaN(importId)) {
            return NextResponse.json(
                { error: "ID de importação inválido" },
                { status: 400 }
            )
        }

        const importData = await db.import.findUnique({
            where: { id: importId }
        })

        if (!importData) {
            return NextResponse.json(
                { error: "Importação não encontrada" },
                { status: 404 }
            )
        }

        const hasAccess = await validateCompanyAccess(userId, importData.companyId)
        if (!hasAccess) return forbiddenResponse()

        await db.import.delete({
            where: { id: importId }
        })

        return NextResponse.json({ success: true, message: "Importação excluída com sucesso" }, { status: 200 })
    } catch (error) {
        console.error("DELETE IMPORT ERROR:", error)
        return NextResponse.json(
            { error: "Erro interno ao excluir importação" },
            { status: 500 }
        )
    }
}

