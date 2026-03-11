import db from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from 'bcrypt'
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from "@/lib/auth";

export async function PUT(req: NextRequest) {
    try {
        const userSession = await getSessionUser(req) as any
        if (!userSession) return unauthorizedResponse()

        const { name, email, role, current_password, password, user_id } = await req.json()

        const targetUser = await db.user.findUnique({
            where: { id: user_id }
        })

        if (!targetUser) {
            return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
        }

        const isSelfUpdate = userSession.id === user_id
        const isCompanyAdmin = userSession.role === "ADMIN" && userSession.companyId === targetUser.companyId

        if (!isSelfUpdate && !isCompanyAdmin) {
            return forbiddenResponse()
        }

        if (password) {
            if (!current_password) {
                return NextResponse.json(
                    { error: "senha atual obrigatória" },
                    { status: 400 }
                )
            }

            const verify_password = await bcrypt.compare(
                current_password,
                targetUser.password || ''
            )

            if (!verify_password) {
                return NextResponse.json(
                    { error: "senha atual incorreta" },
                    { status: 401 }
                )
            }
        }

        let hashedPassword: string | undefined

        if (password) {
            hashedPassword = await bcrypt.hash(password, 10)
        }

        const response = await db.user.update({
            where: { id: user_id },
            data: {
                ...(name && { name }),
                ...(email && { email }),
                ...(role && isCompanyAdmin && { role }),
                ...(hashedPassword && { password: hashedPassword })
            }
        })

        return NextResponse.json(response)
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: "erro interno" }, { status: 500 })
    }
}