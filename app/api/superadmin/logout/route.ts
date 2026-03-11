import { NextResponse } from "next/server"

export async function POST() {
    const response = NextResponse.json(
        { message: "Superadmin deslogado" },
        { status: 200 }
    )

    response.cookies.set("super_auth_token", "", {
        httpOnly: true,
        expires: new Date(0),
        path: "/",
    })

    response.cookies.set("auth_token", "", {
        httpOnly: true,
        expires: new Date(0),
        path: "/",
    })

    return response
}
