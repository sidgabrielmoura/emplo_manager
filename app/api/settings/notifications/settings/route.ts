import db from "@/lib/prisma"
import { getServerUserId, unauthorizedResponse, validateCompanyAccess, forbiddenResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const { searchParams } = new URL(req.url)
        const companyId = searchParams.get("companyId")
        if (!companyId) {
            return NextResponse.json({ error: "ID da empresa ausente" }, { status: 400 })
        }

        const hasAccess = await validateCompanyAccess(userId, companyId)
        if (!hasAccess) return forbiddenResponse()

        const company = await db.company.findUnique({
            where: { id: companyId },
            select: { notificationIntervalDays: true }
        })

        if (!company) {
            return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 })
        }

        return NextResponse.json({
            notificationIntervalDays: company.notificationIntervalDays || 10
        }, { status: 200 })
    } catch (error) {
        console.error("GET NOTIFICATION SETTINGS ERROR:", error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}

export async function PUT(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const body = await req.json()
        const { companyId, notificationIntervalDays } = body

        if (!companyId || notificationIntervalDays === undefined) {
            return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 })
        }

        const intervalNumber = Number(notificationIntervalDays)
        if (![5, 10, 15].includes(intervalNumber)) {
            return NextResponse.json({ error: "O período de envio deve ser de 5, 10 ou 15 dias" }, { status: 400 })
        }

        const hasAccess = await validateCompanyAccess(userId, companyId)
        if (!hasAccess) return forbiddenResponse()

        const company = await db.company.update({
            where: { id: companyId },
            data: {
                notificationIntervalDays: intervalNumber
            },
            select: {
                id: true,
                notificationIntervalDays: true
            }
        })

        return NextResponse.json({
            success: true,
            notificationIntervalDays: company.notificationIntervalDays
        }, { status: 200 })
    } catch (error) {
        console.error("UPDATE NOTIFICATION SETTINGS ERROR:", error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}
