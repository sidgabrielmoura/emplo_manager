import db from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { getSessionUser, unauthorizedResponse } from "@/lib/auth"

export async function PUT(req: NextRequest) {
    try {
        const userSession = await getSessionUser(req)
        if (!userSession) return unauthorizedResponse()

        const { name, email } = await req.json()
        const userId = userSession.id

        if (email && email !== userSession.email) {
            const emailExists = await db.user.findFirst({
                where: { email }
            })

            if (emailExists) {
                return NextResponse.json(
                    { error: "Este email já está em uso" },
                    { status: 400 }
                )
            }
        }

        const updatedUser = await db.user.update({
            where: { id: userId },
            data: {
                ...(name && { name }),
                ...(email && { email })
            }
        })

        const newToken = jwt.sign(
            {
                sub: updatedUser.id,
                email: updatedUser.email,
                role: updatedUser.role,
                name: updatedUser.name
            },
            process.env.JWT_SECRET!,
            { expiresIn: "7d" }
        )

        const response = NextResponse.json(
            { message: "Perfil atualizado", user: updatedUser },
            { status: 200 }
        )

        response.cookies.set("auth_token", newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
        })

        return response
    } catch (error) {
        console.error(error)
        return NextResponse.json(
            { error: "Erro interno ao atualizar perfil" },
            { status: 500 }
        )
    }
}
