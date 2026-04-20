import db from "@/lib/prisma"
import { getServerUserId, unauthorizedResponse, validateCompanyAccess, forbiddenResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const { id } = await req.json()

        const hasAccess = await validateCompanyAccess(userId, id)
        if (!hasAccess) return forbiddenResponse()

        const response = await db.company.findFirst({
            where: {
                id: id
            },
            select: {
                name: true,
                imageUrl: true,
                id: true,
                cnpj: true,
                email: true,
                phone: true,
                address: true,
                state: true,
                city: true,
                responsible: true,
                status: true,
                disabledDocuments: true,
                standardDocumentValidity: true,
                standardDocumentLabels: true,
                createdAt: true
            }
        })

        return NextResponse.json(response, { status: 200 })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}