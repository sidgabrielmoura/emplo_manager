import db from "@/lib/prisma"
import jwt from "jsonwebtoken"
import { NextRequest, NextResponse } from "next/server"

type TokenPayload = {
    sub: string
    email: string
    role: string
    name: string
}

export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get("super_auth_token")?.value

        if (!token) {
            return NextResponse.json(
                { error: "Não autenticado" },
                { status: 401 }
            )
        }

        let decoded: TokenPayload

        try {
            decoded = jwt.verify(
                token,
                process.env.JWT_SECRET!
            ) as TokenPayload
        } catch {
            return NextResponse.json(
                { error: "Token inválido ou expirado" },
                { status: 401 }
            )
        }

        const superadmin = await db.superadmin.findUnique({
            where: { id: decoded.sub },
            include: { notificationPreferences: true }
        })

        if (!superadmin) {
            return NextResponse.json(
                { error: "Superadmin não encontrado" },
                { status: 404 }
            )
        }

        return NextResponse.json(
            {
                authenticated: true,
                user: {
                    id: superadmin.id,
                    email: superadmin.email,
                    role: "SUPERADMIN",
                    name: superadmin.name,
                    notificationPreferences: superadmin.notificationPreferences
                },
            },
            { status: 200 }
        )
    } catch (error) {
        console.error("[SUPERADMIN_AUTH_CHECK_ERROR]", error)
        return NextResponse.json(
            { error: "Erro interno de autenticação" },
            { status: 500 }
        )
    }
}
