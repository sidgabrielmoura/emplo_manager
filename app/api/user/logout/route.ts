import { NextResponse } from "next/server"

export async function POST() {
    try {
        const response = NextResponse.json(
            { message: "Logout realizado com sucesso" },
            { status: 200 }
        )

        response.cookies.set("auth_token", "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            expires: new Date(0),
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
            { error: "Erro ao deslogar" },
            { status: 500 }
        )
    }
}
