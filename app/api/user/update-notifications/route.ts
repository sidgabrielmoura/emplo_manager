import db from "@/lib/prisma"
import { getServerUserId, unauthorizedResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

export async function PUT(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const { documentExpirationAlerts, newEmployeeAlerts, email } = await req.json()

        const updatedPreferences = await db.notificationPreferences.upsert({
            where: { userId: userId },
            update: {
                documentExpirationAlerts,
                newEmployeeAlerts,
                email
            },
            create: {
                userId: userId,
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
