import db from "@/lib/prisma";
import { getServerUserId, unauthorizedResponse, validateCompanyAccess, forbiddenResponse } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

function parseDateOnly(date: string) {
    const [year, month, day] = date.split("-").map(Number)
    return new Date(Date.UTC(year, month - 1, day))
}

export async function PUT(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const body = await req.json()

        if (!body.fileUrl) {
            return NextResponse.json({ error: 'URL do arquivo não encontrada' }, { status: 400 })
        }

        if (!body.id && body.companyId && body.type) {
            const hasAccess = await validateCompanyAccess(userId, body.companyId)
            if (!hasAccess) return forbiddenResponse()

            const created = await db.companyDocument.upsert({
                where: {
                    companyId_type: {
                        companyId: body.companyId,
                        type: body.type
                    }
                },
                update: {
                    fileUrl: body.fileUrl,
                    expiresAt: body.expiresAt ? parseDateOnly(body.expiresAt) : null,
                    issuedAt: body.issuedAt ? parseDateOnly(body.issuedAt) : null,
                    status: 'APPROVED'
                },
                create: {
                    companyId: body.companyId,
                    type: body.type,
                    fileUrl: body.fileUrl,
                    expiresAt: body.expiresAt ? parseDateOnly(body.expiresAt) : null,
                    issuedAt: body.issuedAt ? parseDateOnly(body.issuedAt) : null,
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

            const response = await db.companyDocument.update({
                where: { id: body.id },
                data: {
                    fileUrl: body.fileUrl,
                    expiresAt: body.expiresAt ? parseDateOnly(body.expiresAt) : null,
                    issuedAt: body.issuedAt ? parseDateOnly(body.issuedAt) : null,
                    status: 'APPROVED'
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
