import db from "@/lib/prisma"
import { getServerUserId, unauthorizedResponse, validateCompanyAccess, forbiddenResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { processImportItem } from "@/lib/import-queue"

export async function POST(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const body = await req.json()
        const { itemId, ...fields } = body

        if (!itemId) {
            return NextResponse.json(
                { error: "ID do item ausente" },
                { status: 400 }
            )
        }

        const item = await db.importItem.findUnique({
            where: { id: itemId },
            include: { importacao: true }
        })

        if (!item) {
            return NextResponse.json(
                { error: "Item de importação não encontrado" },
                { status: 404 }
            )
        }

        const hasAccess = await validateCompanyAccess(userId, item.importacao.companyId)
        if (!hasAccess) return forbiddenResponse()

        // Update item with the corrected fields and reset status to PENDING
        await db.importItem.update({
            where: { id: itemId },
            data: {
                nome: fields.nome !== undefined ? fields.nome : item.nome,
                email: fields.email !== undefined ? fields.email : item.email,
                cpf: fields.cpf !== undefined ? fields.cpf : item.cpf,
                cargo: fields.cargo !== undefined ? fields.cargo : item.cargo,
                genero: fields.genero !== undefined ? fields.genero : item.genero,
                nascimento: fields.nascimento !== undefined ? fields.nascimento : item.nascimento,
                contato: fields.contato !== undefined ? fields.contato : item.contato,
                data_admissao: fields.data_admissao !== undefined ? fields.data_admissao : item.data_admissao,
                cep: fields.cep !== undefined ? fields.cep : item.cep,
                address: fields.address !== undefined ? fields.address : item.address,
                number: fields.number !== undefined ? fields.number : item.number,
                district: fields.district !== undefined ? fields.district : item.district,
                city: fields.city !== undefined ? fields.city : item.city,
                complement: fields.complement !== undefined ? fields.complement : item.complement,
                costCenterId: fields.costCenterId !== undefined ? fields.costCenterId : item.costCenterId,
                status: "PENDING",
                erro: null
            }
        })

        // Re-process the individual item
        const result = await processImportItem(itemId)

        // Retrieve the updated item and its parent import stats
        const updatedItem = await db.importItem.findUnique({
            where: { id: itemId }
        })

        const updatedImport = await db.import.findUnique({
            where: { id: item.importacao_id }
        })

        return NextResponse.json({
            success: result.success,
            errorMsg: result.errorMsg,
            item: updatedItem,
            import: updatedImport
        }, { status: 200 })

    } catch (error) {
        console.error("CORRECT IMPORT ITEM ERROR:", error)
        return NextResponse.json(
            { error: "Erro interno ao processar correção" },
            { status: 500 }
        )
    }
}
