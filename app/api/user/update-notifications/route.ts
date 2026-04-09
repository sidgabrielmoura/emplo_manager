import db from "@/lib/prisma"
import { getSessionUser, unauthorizedResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

export async function PUT(req: NextRequest) {
    try {
        const user = await getSessionUser(req)
        if (!user) return unauthorizedResponse()

        const { documentExpirationAlerts, newEmployeeAlerts, email } = await req.json()

        const isSuperadminTable = await db.superadmin.findUnique({ where: { id: user.id } })

        const updatedPreferences = await db.notificationPreferences.upsert({
            where: isSuperadminTable
                ? { superadminId: user.id }
                : { userId: user.id },
            update: {
                documentExpirationAlerts,
                newEmployeeAlerts,
                email
            },
            create: {
                ...(isSuperadminTable ? { superadminId: user.id } : { userId: user.id }),
                documentExpirationAlerts,
                newEmployeeAlerts,
                email
            }
        })

        return NextResponse.json(
            { message: "Preferências atualizadas", preferences: updatedPreferences },
            { status: 200 }
        )
    } catch (error) {
        console.error(error)
        return NextResponse.json(
            { error: "Erro interno ao atualizar preferências" },
            { status: 500 }
        )
    }
}
