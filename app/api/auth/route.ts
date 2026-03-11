import { getSessionUser, unauthorizedResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
    try {
        const user = await getSessionUser(req)

        if (!user) {
            return unauthorizedResponse()
        }

        return NextResponse.json(
            {
                authenticated: true,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    name: user.name,
                    notificationPreferences: user.notificationPreferences
                },
            },
            { status: 200 }
        )
    } catch (error) {
        console.error("[AUTH_CHECK_ERROR]", error)

        return NextResponse.json(
            { error: "Erro interno de autenticação" },
            { status: 500 }
        )
    }
}