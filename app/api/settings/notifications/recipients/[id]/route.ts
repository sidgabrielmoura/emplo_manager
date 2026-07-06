import db from "@/lib/prisma"
import { getServerUserId, unauthorizedResponse, validateCompanyAccess, forbiddenResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

export async function DELETE(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const { id } = await props.params

        const recipient = await db.notificationRecipient.findUnique({
            where: { id }
        })

        if (!recipient) {
            return NextResponse.json({ error: "Destinatário não encontrado" }, { status: 404 })
        }

        const hasAccess = await validateCompanyAccess(userId, recipient.companyId)
        if (!hasAccess) return forbiddenResponse()

        await db.notificationRecipient.delete({
            where: { id }
        })

        return NextResponse.json({ success: true }, { status: 200 })
    } catch (error) {
        console.error("DELETE RECIPIENT ERROR:", error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}

export async function PUT(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const { id } = await props.params
        const body = await req.json()
        const { documentExpirationAlerts, newEmployeeAlerts } = body

        const recipient = await db.notificationRecipient.findUnique({
            where: { id }
        })

        if (!recipient) {
            return NextResponse.json({ error: "Destinatário não encontrado" }, { status: 404 })
        }

        const hasAccess = await validateCompanyAccess(userId, recipient.companyId)
        if (!hasAccess) return forbiddenResponse()

        const updated = await db.notificationRecipient.update({
            where: { id },
            data: {
                documentExpirationAlerts: documentExpirationAlerts !== undefined ? documentExpirationAlerts : recipient.documentExpirationAlerts,
                newEmployeeAlerts: newEmployeeAlerts !== undefined ? newEmployeeAlerts : recipient.newEmployeeAlerts
            }
        })

        return NextResponse.json(updated, { status: 200 })
    } catch (error) {
        console.error("PUT RECIPIENT ERROR:", error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}
