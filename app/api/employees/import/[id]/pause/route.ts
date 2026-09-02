import db from "@/lib/prisma"
import { getServerUserId, unauthorizedResponse, validateCompanyAccess, forbiddenResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { pauseImportQueue } from "@/lib/import-queue"
import { validateSpyAction } from "@/lib/spy-guard"

export async function POST(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const params = await props.params
        const importId = parseInt(params.id, 10)
        if (isNaN(importId)) {
            return NextResponse.json({ error: "ID de importação inválido" }, { status: 400 })
        }

        const importData = await db.import.findUnique({
            where: { id: importId }
        })

        if (!importData) {
            return NextResponse.json({ error: "Importação não encontrada" }, { status: 404 })
        }

        const hasAccess = await validateCompanyAccess(userId, importData.companyId)
        if (!hasAccess) return forbiddenResponse()

        // Validate spy permissions
        const spyValidation = await validateSpyAction(req, "employees", "edit")
        if (!spyValidation.authorized) {
            return NextResponse.json({ error: spyValidation.reason || "Não autorizado" }, { status: 403 })
        }

        await pauseImportQueue(importId)

        return NextResponse.json({ success: true, message: "Importação pausada com sucesso" }, { status: 200 })
    } catch (error) {
        console.error("PAUSE IMPORT ERROR:", error)
        return NextResponse.json({ error: "Erro interno ao pausar importação" }, { status: 500 })
    }
}
