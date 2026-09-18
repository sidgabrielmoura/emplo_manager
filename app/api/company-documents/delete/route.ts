import db from "@/lib/prisma"
import { getServerUserId, unauthorizedResponse, validateCompanyAccess, forbiddenResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { validateSpyAction } from "@/lib/spy-guard"
import { deleteR2File } from "@/lib/r2"

export async function POST(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const body = await req.json()
        const { companyId, documentId, type, name, isCustom, deleteFileOnly, disableAfterDelete } = body

        if (!companyId) {
            return NextResponse.json({ error: "companyId é obrigatório" }, { status: 400 })
        }

        const hasAccess = await validateCompanyAccess(userId, companyId)
        if (!hasAccess) return forbiddenResponse()

        const spyValidation = await validateSpyAction(req, "company-documents", "edit")
        if (!spyValidation.authorized) {
            return NextResponse.json({ error: spyValidation.reason || "Não autorizado" }, { status: 403 })
        }

        // 1. Localiza documento físico no banco para expurgo do arquivo no R2
        let docQuery: any = { companyId }
        if (documentId && !documentId.startsWith("virtual-")) {
            docQuery = { id: documentId }
        } else if (type && type !== "CUSTOM") {
            docQuery = {
                companyId,
                type
            }
        } else if (name) {
            docQuery = {
                companyId,
                name
            }
        }

        const existingDoc = await db.companyDocument.findFirst({
            where: docQuery
        })

        // Se houver arquivo anexado, expurga do Cloudflare R2
        if (existingDoc?.fileUrl) {
            await deleteR2File(existingDoc.fileUrl)
        }

        // 2. Se for documento personalizado e a intenção for excluir o documento por completo
        const isCustomDoc = isCustom || type === "CUSTOM" || existingDoc?.type === "CUSTOM"

        if (isCustomDoc && !deleteFileOnly) {
            if (existingDoc) {
                await db.companyDocument.delete({
                    where: { id: existingDoc.id }
                }).catch(async () => {
                    await db.companyDocument.update({
                        where: { id: existingDoc.id },
                        data: { deletedAt: new Date(), fileUrl: null }
                    })
                })
            }

            // Remove requisito adicional se existir
            const reqId = documentId?.startsWith("virtual-") ? documentId.replace("virtual-", "") : type
            await db.companyRequiredDocument.deleteMany({
                where: {
                    companyId,
                    OR: [
                        { id: reqId },
                        ...(name ? [{ name: name }] : [])
                    ]
                }
            })
        } else {
            // Documento padrão ou exclusão apenas do arquivo
            if (existingDoc) {
                await db.companyDocument.update({
                    where: { id: existingDoc.id },
                    data: {
                        fileUrl: null,
                        issuedAt: null,
                        expiresAt: null,
                        status: "PENDING"
                    }
                })
            }

            // Se solicitado desabilitar após a remoção do arquivo
            if (disableAfterDelete) {
                const company = await db.company.findUnique({
                    where: { id: companyId },
                    select: { disabledDocuments: true }
                })
                const currentDisabled = company?.disabledDocuments || []
                const identifier = (type && type !== "CUSTOM") ? type : (name || type)

                if (identifier && !currentDisabled.includes(identifier)) {
                    await db.company.update({
                        where: { id: companyId },
                        data: { disabledDocuments: [...currentDisabled, identifier] }
                    })
                }

                if (isCustomDoc) {
                    const reqId = documentId?.startsWith("virtual-") ? documentId.replace("virtual-", "") : type
                    await db.companyRequiredDocument.updateMany({
                        where: {
                            companyId,
                            OR: [
                                { id: reqId },
                                ...(name ? [{ name: name }] : [])
                            ]
                        },
                        data: { isEnabled: false }
                    })
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: "Arquivo/Documento excluído com sucesso."
        })
    } catch (error) {
        console.error("DELETE COMPANY DOCUMENT ERROR:", error)
        return NextResponse.json({ error: "Erro ao excluir documento ou arquivo" }, { status: 500 })
    }
}
