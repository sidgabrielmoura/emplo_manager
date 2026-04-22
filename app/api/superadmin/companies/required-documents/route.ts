import db from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { isSuperAdmin, forbiddenResponse, getServerUserId, unauthorizedResponse } from "@/lib/auth"
import { syncCompanyDocumentExpirations } from "@/lib/docs"

export async function GET(req: NextRequest) {
    try {
        const isSuper = await isSuperAdmin(req)
        if (!isSuper) return forbiddenResponse()

        const { searchParams } = new URL(req.url)
        const companyId = searchParams.get("companyId")

        if (!companyId) {
            return NextResponse.json({ error: "companyId é obrigatório" }, { status: 400 })
        }

        const requirements = await db.companyRequiredDocument.findMany({
            where: { companyId },
            orderBy: { createdAt: "desc" }
        })

        return NextResponse.json(requirements, { status: 200 })
    } catch (error) {
        console.error("[SUPERADMIN_GET_REQUIREMENTS]", error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const isSuper = await isSuperAdmin(req)
        if (!isSuper) return forbiddenResponse()

        const body = await req.json()
        const { companyId, name, target, validityDays } = body

        if (!companyId || !name || !target) {
            return NextResponse.json({ error: "Dados obrigatórios ausentes" }, { status: 400 })
        }

        const requirement = await db.companyRequiredDocument.create({
            data: {
                companyId,
                name,
                target,
                validityDays: validityDays ? parseInt(validityDays) : null
            }
        })

        return NextResponse.json(requirement, { status: 201 })
    } catch (error: any) {
        if (error.code === "P2002") {
            return NextResponse.json({ error: "Documento já cadastrado para este alvo" }, { status: 409 })
        }
        console.error("[SUPERADMIN_CREATE_REQUIREMENT]", error)
        return NextResponse.json({ error: "Erro ao criar requisito" }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const isSuper = await isSuperAdmin(req)
        if (!isSuper) return forbiddenResponse()

        const body = await req.json()
        const { requirementId } = body

        if (!requirementId) {
            return NextResponse.json({ error: "requirementId é obrigatório" }, { status: 400 })
        }

        const requirement = await db.companyRequiredDocument.findUnique({
            where: { id: requirementId }
        })

        if (!requirement) {
            return NextResponse.json({ error: "Requisito não encontrado" }, { status: 404 })
        }

        
        if (requirement.target === "COMPANY_DOC" || requirement.target === "COMPANY_LABOR") {
            await db.companyDocument.updateMany({
                where: {
                    companyId: requirement.companyId,
                    type: "CUSTOM",
                    name: requirement.name,
                    deletedAt: null
                },
                data: { deletedAt: new Date() }
            })
        } else if (requirement.target === "EMPLOYEE_DOC") {
            await db.document.updateMany({
                where: {
                    employee: { companyId: requirement.companyId },
                    type: "CUSTOM",
                    name: requirement.name,
                    deletedAt: null
                },
                data: { deletedAt: new Date() }
            })
        } else if (requirement.target === "EMPLOYEE_TRAINING") {
            await db.training.updateMany({
                where: {
                    employee: { companyId: requirement.companyId },
                    type: "CUSTOM",
                    name: requirement.name,
                    deletedAt: null
                },
                data: { deletedAt: new Date() }
            })
        }

        await db.companyRequiredDocument.delete({
            where: { id: requirementId }
        })

        return NextResponse.json({ message: "Requisito removido com sucesso" }, { status: 200 })
    } catch (error) {
        console.error("[SUPERADMIN_DELETE_REQUIREMENT]", error)
        return NextResponse.json({ error: "Erro ao deletar requisito" }, { status: 500 })
    }
}

export async function PUT(req: NextRequest) {
    try {
        const isSuper = await isSuperAdmin(req)
        if (!isSuper) return forbiddenResponse()

        const body = await req.json()
        const { requirementId, name, target, validityDays } = body

        if (!requirementId) {
            return NextResponse.json({ error: "requirementId é obrigatório" }, { status: 400 })
        }

        const requirement = await db.companyRequiredDocument.update({
            where: { id: requirementId },
            data: {
                name: name || undefined,
                target: target || undefined,
                validityDays: validityDays !== undefined ? (validityDays ? parseInt(validityDays) : null) : undefined
            }
        })

        if (validityDays !== undefined) {
            await syncCompanyDocumentExpirations(requirement.companyId, "CUSTOM", requirement.name)
        }

        return NextResponse.json(requirement, { status: 200 })
    } catch (error) {
        console.error("[SUPERADMIN_UPDATE_REQUIREMENT]", error)
        return NextResponse.json({ error: "Erro ao atualizar requisito" }, { status: 500 })
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const isSuper = await isSuperAdmin(req)
        if (!isSuper) return forbiddenResponse()

        const body = await req.json()
        const { companyId, type, action } = body

        if (!companyId || !type || !action) {
            return NextResponse.json({ error: "Dados obrigatórios ausentes" }, { status: 400 })
        }

        if (action === "toggle-requirement") {
            const { isEnabled } = body
            const req = await db.companyRequiredDocument.update({
                where: { id: type },
                data: { isEnabled: !!isEnabled }
            })
            return NextResponse.json(req, { status: 200 })
        }

        const company = await db.company.findUnique({
            where: { id: companyId },
            select: {
                disabledDocuments: true,
                standardDocumentValidity: true,
                standardDocumentLabels: true
            }
        })

        if (!company) {
            return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 })
        }

        const data: any = {}

        if (action === "set-config") {
            const { name, validityDays: days } = body

            if (days !== undefined) {
                const currentValidity = (company.standardDocumentValidity as any) || {}
                data.standardDocumentValidity = {
                    ...currentValidity,
                    [type]: days ? parseInt(days) : null
                }
            }

            if (name !== undefined) {
                const currentLabels = (company.standardDocumentLabels as any) || {}
                data.standardDocumentLabels = {
                    ...currentLabels,
                    [type]: name || null
                }
            }
        } else {
            const disabledDocs = (company.disabledDocuments as any) || []
            let newDisabled = [...disabledDocs]
            if (action === "disable") {
                if (!newDisabled.includes(type)) newDisabled.push(type)
            } else {
                newDisabled = newDisabled.filter(t => t !== type)
            }
            data.disabledDocuments = newDisabled
        }

        await db.company.update({
            where: { id: companyId },
            data
        })

        if (action === "set-config" && body.validityDays !== undefined) {
            await syncCompanyDocumentExpirations(companyId, type)
        }

        return NextResponse.json({ success: true, ...data }, { status: 200 })
    } catch (error) {
        console.error("[SUPERADMIN_PATCH_COMPANY_DOCS]", error)
        return NextResponse.json({ error: "Erro ao atualizar configurações" }, { status: 500 })
    }
}
