import db from "@/lib/prisma"
import { getServerUserId, unauthorizedResponse, validateCompanyAccess, forbiddenResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { processImportQueue } from "@/lib/import-queue"
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

        // Reset failed items to PENDING so queue will process them
        await db.importItem.updateMany({
            where: {
                importacao_id: importId,
                status: "FAILED"
            },
            data: {
                status: "PENDING",
                erro: null
            }
        })

        // Update import status to PROCESSING
        await db.import.update({
            where: { id: importId },
            data: { status: "PROCESSING" }
        })

        // Trigger queue processing asynchronously
        processImportQueue(importId).catch(err => {
            console.error("Retry import queue error:", err)
        })

        return NextResponse.json({ success: true, message: "Reprocessamento iniciado" }, { status: 200 })
    } catch (error) {
        console.error("RETRY IMPORT ERROR:", error)
        return NextResponse.json({ error: "Erro interno ao reprocessar" }, { status: 500 })
    }
}
