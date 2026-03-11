import db from "@/lib/prisma"
import bcrypt from 'bcrypt'
import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json()

        const superadmin = await db.superadmin.findUnique({ where: { email } })

        if (!superadmin) {
            return NextResponse.json(
                { error: "Superadmin não encontrado" },
                { status: 401 }
            )
        }

        const valid = await bcrypt.compare(password, superadmin.password)

        if (!valid) {
            return NextResponse.json(
                { error: "Senha inválida" },
                { status: 401 }
            )
        }

        const token = jwt.sign(
            {
                sub: superadmin.id,
                email: superadmin.email,
                role: "SUPERADMIN",
                name: superadmin.name
            },
            process.env.JWT_SECRET!,
            { expiresIn: "7d" }
        )

        const response = NextResponse.json(
            { message: "Superadmin logado" },
            { status: 200 }
        )

        response.cookies.set("super_auth_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
        })

        response.cookies.set("auth_token", "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            expires: new Date(0),
        })

        return response
    } catch (error) {
        console.error("[SUPERADMIN_LOGIN_ERROR]", error)
        return NextResponse.json(
            { error: "Erro interno" },
            { status: 500 }
        )
    }
}
