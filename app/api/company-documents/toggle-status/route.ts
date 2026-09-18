import db from "@/lib/prisma"
import { getServerUserId, unauthorizedResponse, validateCompanyAccess, forbiddenResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { validateSpyAction } from "@/lib/spy-guard"

export async function PUT(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const body = await req.json()
        const { companyId, type, name, isEnabled, isCustom } = body

        if (!companyId || !type || isEnabled === undefined) {
            return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 })
        }

        const hasAccess = await validateCompanyAccess(userId, companyId)
        if (!hasAccess) return forbiddenResponse()

        // Verificação de permissões do espião
        const spyValidation = await validateSpyAction(req, "company-documents", "edit")
        if (!spyValidation.authorized) {
            return NextResponse.json({ error: spyValidation.reason || "Não autorizado" }, { status: 403 })
        }

        const company = await db.company.findUnique({
            where: { id: companyId },
            select: { disabledDocuments: true }
        })

        if (!company) {
            return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 })
        }

        let updatedDisabled = [...(company.disabledDocuments || [])]

        // 1. Caso seja documento padrão
        if (!isCustom && type !== "CUSTOM") {
            if (isEnabled) {
                updatedDisabled = updatedDisabled.filter(t => t !== type)
            } else {
                if (!updatedDisabled.includes(type)) {
                    updatedDisabled.push(type)
                }
            }

            await db.company.update({
                where: { id: companyId },
                data: { disabledDocuments: updatedDisabled }
            })
        }

        // 2. Caso seja documento customizado ou requisito adicional
        if (isCustom || type === "CUSTOM") {
            // Pode vir com o ID do requisito ou o nome do documento
            const requirement = await db.companyRequiredDocument.findFirst({
                where: {
                    companyId,
                    OR: [
                        { id: type },
                        { id: type.replace("virtual-", "") },
                        ...(name ? [{ name: name }] : [])
                    ]
                }
            })

            if (requirement) {
                await db.companyRequiredDocument.update({
                    where: { id: requirement.id },
                    data: { isEnabled: !!isEnabled }
                })
            }

            // Sincroniza também no disabledDocuments para garantir redundância
            const identifier = name || requirement?.name || type
            if (identifier) {
                if (isEnabled) {
                    updatedDisabled = updatedDisabled.filter(t => t !== identifier && t !== type)
                } else {
                    if (!updatedDisabled.includes(identifier)) {
                        updatedDisabled.push(identifier)
                    }
                }
                await db.company.update({
                    where: { id: companyId },
                    data: { disabledDocuments: updatedDisabled }
                })
            }
        }

        return NextResponse.json({
            success: true,
            isEnabled,
            type,
            disabledDocuments: updatedDisabled
        })
    } catch (error) {
        console.error("TOGGLE COMPANY DOCUMENT STATUS ERROR:", error)
        return NextResponse.json({ error: "Erro interno ao atualizar status do documento" }, { status: 500 })
    }
}
