import db from "@/lib/prisma";
import { getServerUserId, unauthorizedResponse, validateCompanyAccess, forbiddenResponse } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { calculateDocumentDates } from "@/lib/docs";


export async function PUT(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const body = await req.json()

        if (!body.fileUrl) {
            return NextResponse.json({ error: 'URL do arquivo não encontrada' }, { status: 400 })
        }

        const isVirtual = body.id && body.id.startsWith('virtual-')

        if (isVirtual) {
            const requirementId = body.id.replace('virtual-', '')
            const requirement = await db.companyRequiredDocument.findUnique({
                where: { id: requirementId }
            })

            if (!requirement) {
                return NextResponse.json({ error: "Requisito não encontrado" }, { status: 404 })
            }

            const hasAccess = await validateCompanyAccess(userId, body.companyId)
            if (!hasAccess) return forbiddenResponse()

            const { issuedAt, expiresAt } = await calculateDocumentDates({
                companyId: body.companyId,
                type: 'CUSTOM',
                name: requirement.name,
                requirementId: requirementId
            })

            const response = await db.companyDocument.upsert({
                where: {
                    companyId_type_name: {
                        companyId: body.companyId,
                        type: 'CUSTOM',
                        name: requirement.name
                    }
                },
                update: {
                    fileUrl: body.fileUrl,
                    expiresAt,
                    issuedAt,
                    status: 'APPROVED'
                },
                create: {
                    companyId: body.companyId,
                    type: 'CUSTOM',
                    name: requirement.name,
                    fileUrl: body.fileUrl,
                    expiresAt,
                    issuedAt,
                    status: 'APPROVED'
                }
            })

            return NextResponse.json(response)
        }

        if (!body.id && body.companyId && body.type) {
            const hasAccess = await validateCompanyAccess(userId, body.companyId)
            if (!hasAccess) return forbiddenResponse()

            const { issuedAt, expiresAt } = await calculateDocumentDates({
                companyId: body.companyId,
                type: body.type,
                name: body.name
            })

            const created = await db.companyDocument.upsert({
                where: {
                    companyId_type_name: {
                        companyId: body.companyId,
                        type: body.type,
                        name: body.name || ""
                    }
                },
                update: {
                    fileUrl: body.fileUrl,
                    expiresAt,
                    issuedAt,
                    status: 'APPROVED'
                },
                create: {
                    companyId: body.companyId,
                    type: body.type,
                    name: body.name || "",
                    fileUrl: body.fileUrl,
                    expiresAt,
                    issuedAt,
                    status: 'APPROVED'
                }
            })
            return NextResponse.json(created)
        }

        if (body.id) {
            const existingDoc = await db.companyDocument.findUnique({
                where: { id: body.id },
                select: { companyId: true }
            })

            if (!existingDoc) {
                return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 })
            }

            const hasAccess = await validateCompanyAccess(userId, existingDoc.companyId)
            if (!hasAccess) return forbiddenResponse()

            const { issuedAt, expiresAt } = await calculateDocumentDates({
                companyId: existingDoc.companyId,
                type: (existingDoc as any).type,
                name: (existingDoc as any).name
            })

            const response = await db.companyDocument.update({
                where: { id: body.id },
                data: {
                    fileUrl: body.fileUrl,
                    expiresAt,
                    issuedAt,
                    status: 'APPROVED',
                    deletedAt: null
                }
            })

            return NextResponse.json(response)
        }

        return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Erro interno ao atualizar documento' }, { status: 500 })
    }
}
