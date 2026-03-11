import db from "@/lib/prisma"
import { getSessionUser, unauthorizedResponse, forbiddenResponse, validateCompanyAccess } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

export async function PUT(req: NextRequest) {
    try {
        const userSession = await getSessionUser(req)
        if (!userSession) return unauthorizedResponse()

        const body = await req.json()
        const { companyId } = body

        if (!companyId) {
            return NextResponse.json({ error: 'ID da empresa não informado' }, { status: 400 })
        }

        const isAdmin = userSession.role === "ADMIN"
        const isSuper = userSession.role === "SUPERADMIN"

        if (!isAdmin && !isSuper) return forbiddenResponse()

        if (isAdmin) {
            const hasAccess = await validateCompanyAccess(userSession.id, companyId)
            if (!hasAccess) return forbiddenResponse()
        }

        const company = await db.company.update({
            where: { id: companyId },
            data: {
                name: body.name,
                imageUrl: body.imageUrl,
                cnpj: body.cnpj,
                email: body.email,
                phone: body.phone,
                address: body.address,
                state: body.state,
                city: body.city,
                responsible: body.responsible
            }
        })

        return NextResponse.json({ response: company }, { status: 200 })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Erro interno ao atualizar a empresa' }, { status: 500 })
    }
}
