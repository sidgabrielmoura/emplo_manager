import db from "@/lib/prisma"
import bcrypt from 'bcrypt'
import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json()

        const user = await db.user.findFirst({ where: { email } })

        if (!user) {
            return NextResponse.json(
                { error: "Usuário ou senha inválidos" },
                { status: 401 }
            )
        }

        const valid = await bcrypt.compare(password, user.password)

        if (!valid) {
            return NextResponse.json(
                { error: "Usuário ou senha inválidos" },
                { status: 401 }
            )
        }

        const token = jwt.sign(
            {
                sub: user.id,
                email: user.email,
                role: user.role,
                name: user.name
            },
            process.env.JWT_SECRET!,
            { expiresIn: "7d" }
        )

        const response = NextResponse.json(
            { message: "Usuário logado" },
            { status: 200 }
        )

        response.cookies.set("auth_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
        })

        response.cookies.set("super_auth_token", "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            expires: new Date(0),
        })

        return response
    } catch (error) {
        return NextResponse.json(
            { error: "Erro interno" },
            { status: 500 }
        )
    }
}
