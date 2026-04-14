import db from "@/lib/prisma"
import bcrypt from 'bcrypt'
import { getSessionUser, unauthorizedResponse, validateCompanyAccess, forbiddenResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
    try {
        const userSession = await getSessionUser(req)
        if (!userSession) return unauthorizedResponse()

        const body = await req.json()
        const { name, email, password, role, companyId } = body

        if (!["ADMIN", "SUPERADMIN"].includes(userSession.role)) return forbiddenResponse()

        const hasAccess = await validateCompanyAccess(userSession.id, companyId)
        if (!hasAccess) return forbiddenResponse()

        const hashedPassword = await bcrypt.hash(password, 10)

        const user = await db.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
                companyId,
                notificationPreferences: {
                    create: {}
                }
            }
        })

        return NextResponse.json({ user }, { status: 201 })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}