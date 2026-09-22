import db from "@/lib/prisma"
import { getServerUserId, unauthorizedResponse, validateCompanyAccess, forbiddenResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { validateSpyAction } from "@/lib/spy-guard"
import { deleteR2Files } from "@/lib/r2"

export async function POST(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const body = await req.json()
        const { companyId, stage, deleteFileOnly, disableAfterDelete } = body

        if (!companyId) {
            return NextResponse.json({ error: "companyId é obrigatório" }, { status: 400 })
        }

        const hasAccess = await validateCompanyAccess(userId, companyId)
        if (!hasAccess) return forbiddenResponse()

        const spyValidation = await validateSpyAction(req, "company-documents", "edit")
        if (!spyValidation.authorized) {
            return NextResponse.json({ error: spyValidation.reason || "Não autorizado" }, { status: 403 })
        }

        // Normaliza itens a serem processados (suporta lote ou requisição individual legada)
        const rawItems: Array<{
            documentId?: string
            type?: string
            name?: string
            isCustom?: boolean
        }> = Array.isArray(body.items) && body.items.length > 0
            ? body.items
            : [{
                documentId: body.documentId,
                type: body.type,
                name: body.name,
                isCustom: body.isCustom
            }]

        const isAttachmentStage = stage === "attachment" || deleteFileOnly === true

        // 1. Localiza todos os documentos físicos existentes no banco para os itens fornecidos
        const existingDocs: any[] = []
        for (const item of rawItems) {
            let docQuery: any = { companyId, deletedAt: null }
            if (item.documentId && !item.documentId.startsWith("virtual-")) {
                docQuery = { id: item.documentId, companyId }
            } else if (item.type && item.type !== "CUSTOM") {
                docQuery = { companyId, type: item.type }
            } else if (item.name) {
                docQuery = { companyId, name: item.name }
            }

            const doc = await db.companyDocument.findFirst({ where: docQuery })
            if (doc) {
                existingDocs.push({ item, doc })
            }
        }

        // 2. Coleta e expurga arquivos do Cloudflare R2
        const fileUrls = existingDocs.map(d => d.doc.fileUrl).filter(Boolean)
        if (fileUrls.length > 0) {
            await deleteR2Files(fileUrls)
        }

        // 3. Processamento conforme estágio
        if (isAttachmentStage) {
            // Estágio 1: apenas remover anexo e zerar metadados, mantendo a linha
            const docIdsToReset = existingDocs.map(d => d.doc.id)
            if (docIdsToReset.length > 0) {
                await db.companyDocument.updateMany({
                    where: { id: { in: docIdsToReset }, companyId },
                    data: {
                        fileUrl: null,
                        issuedAt: null,
                        expiresAt: null,
                        status: "PENDING"
                    }
                })
            }
        } else {
            // Estágio 2: remoção completa da linha
            const disabledToAdd: string[] = []

            for (const { item, doc } of existingDocs) {
                const isCustomDoc = item.isCustom || item.type === "CUSTOM" || doc.type === "CUSTOM"
                if (isCustomDoc) {
                    await db.companyDocument.delete({
                        where: { id: doc.id }
                    }).catch(async () => {
                        await db.companyDocument.update({
                            where: { id: doc.id },
                            data: { deletedAt: new Date(), fileUrl: null }
                        })
                    })
                } else {
                    await db.companyDocument.delete({
                        where: { id: doc.id }
                    }).catch(async () => {
                        await db.companyDocument.update({
                            where: { id: doc.id },
                            data: { deletedAt: new Date(), fileUrl: null, status: "PENDING" }
                        })
                    })
                    const identifier = item.type || doc.type
                    if (identifier && !disabledToAdd.includes(identifier)) {
                        disabledToAdd.push(identifier)
                    }
                }
            }

            // Para itens que não tinham doc físico existente ou virtuais
            for (const item of rawItems) {
                const isCustomDoc = item.isCustom || item.type === "CUSTOM"
                if (isCustomDoc) {
                    const reqId = item.documentId?.startsWith("virtual-") ? item.documentId.replace("virtual-", "") : item.type
                    await db.companyRequiredDocument.deleteMany({
                        where: {
                            companyId,
                            OR: [
                                ...(reqId ? [{ id: reqId }] : []),
                                ...(item.name ? [{ name: item.name }] : [])
                            ]
                        }
                    })
                } else {
                    const identifier = item.type || item.name
                    if (identifier && !disabledToAdd.includes(identifier)) {
                        disabledToAdd.push(identifier)
                    }
                }
            }

            if (disabledToAdd.length > 0 || disableAfterDelete) {
                const company = await db.company.findUnique({
                    where: { id: companyId },
                    select: { disabledDocuments: true }
                })
                const currentDisabled = company?.disabledDocuments || []
                const newDisabled = Array.from(new Set([...currentDisabled, ...disabledToAdd]))
                await db.company.update({
                    where: { id: companyId },
                    data: { disabledDocuments: newDisabled }
                })
            }
        }

        return NextResponse.json({
            success: true,
            message: isAttachmentStage ? "Anexo(s) excluído(s) com sucesso." : "Linha(s) excluída(s) com sucesso."
        })
    } catch (error) {
        console.error("DELETE COMPANY DOCUMENT ERROR:", error)
        return NextResponse.json({ error: "Erro ao excluir documento(s) ou arquivo(s)" }, { status: 500 })
    }
}
