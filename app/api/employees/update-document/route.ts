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
            return NextResponse.json({ error: 'url do arquivo não encontrada' }, { status: 400 })
        }

        const document = await db.document.findUnique({
            where: { id: body.id },
            include: { employee: { select: { companyId: true } } }
        })

        if (!document || !document.employee) {
            return NextResponse.json({ error: "Documento ou funcionário não encontrado" }, { status: 404 })
        }

        const hasAccess = await validateCompanyAccess(userId, document.employee.companyId)
        if (!hasAccess) return forbiddenResponse()

        const response = await db.document.update({
            where: {
                id: body.id
            },
            data: {
                fileUrl: body.fileUrl,
                expiresAt: body.expiresAt ? parseDateOnly(body.expiresAt) : null,
                issuedAt: body.issuedAt ? parseDateOnly(body.issuedAt) : null,
                status: 'APPROVED'
            }
        })

        return NextResponse.json(response)
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
