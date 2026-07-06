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

        const recipients = await db.notificationRecipient.findMany({
            where: { companyId },
            orderBy: { createdAt: "desc" }
        })

        return NextResponse.json(recipients, { status: 200 })
    } catch (error) {
        console.error("GET RECIPIENTS ERROR:", error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const body = await req.json()
        const { companyId, email, name, documentExpirationAlerts, newEmployeeAlerts } = body

        if (!companyId || !email || !name) {
            return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 })
        }

        const hasAccess = await validateCompanyAccess(userId, companyId)
        if (!hasAccess) return forbiddenResponse()

        // Check duplicate
        const existing = await db.notificationRecipient.findUnique({
            where: {
                companyId_email: {
                    companyId,
                    email: email.trim().toLowerCase()
                }
            }
        })

        if (existing) {
            return NextResponse.json({ error: "Destinatário com este e-mail já cadastrado" }, { status: 400 })
        }

        const recipient = await db.notificationRecipient.create({
            data: {
                companyId,
                email: email.trim().toLowerCase(),
                name: name.trim(),
                documentExpirationAlerts: documentExpirationAlerts ?? true,
                newEmployeeAlerts: newEmployeeAlerts ?? true
            }
        })

        return NextResponse.json(recipient, { status: 201 })
    } catch (error) {
        console.error("CREATE RECIPIENT ERROR:", error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}
