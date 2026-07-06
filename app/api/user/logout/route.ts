import { getSessionUser } from "@/lib/auth"
import db from "@/lib/prisma"
import { getClientIp, logSpyAction } from "@/lib/spy-guard"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
    try {
        const user = await getSessionUser(req)
        
        const response = NextResponse.json(
            { message: "Logout realizado com sucesso" },
            { status: 200 }
        )

        // If the logging out user is a spy, register log and revoke session in DB
        if (user && user.role === "ESPIAO") {
            const spySessionId = (user as any).spySessionId
            const spyAccessId = (user as any).id

            if (spySessionId) {
                await db.spySession.update({
                    where: { id: spySessionId },
                    data: {
                        status: "LOGGED_OUT",
                        loggedOutAt: new Date()
                    }
                }).catch(console.error)
            }

            if (spyAccessId) {
                await logSpyAction({
                    spyAccessId,
                    action: "LOGOUT",
                    details: "Espião efetuou logout manualmente da sessão",
                    ip: getClientIp(req)
                }).catch(console.error)
            }
        }

        // Clean all auth cookies
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax" as const,
            path: "/",
            expires: new Date(0),
        }

        response.cookies.set("auth_token", "", cookieOptions)
        response.cookies.set("super_auth_token", "", cookieOptions)
        response.cookies.set("spy_access_token", "", cookieOptions)

        return response
    } catch (error) {
        console.error("LOGOUT ERROR:", error)
        return NextResponse.json(
            { error: "Erro ao deslogar" },
            { status: 500 }
        )
    }
}
