import { getSessionUser, unauthorizedResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
    try {
        const user = await getSessionUser(req)

        if (!user) {
            return unauthorizedResponse()
        }

        let parsedPermissions = (user as any).permissions || null
        if (typeof parsedPermissions === "string") {
            try {
                parsedPermissions = JSON.parse(parsedPermissions)
            } catch {}
        }

        let parsedCostCenters = (user as any).costCenters || null
        if (typeof parsedCostCenters === "string") {
            try {
                parsedCostCenters = JSON.parse(parsedCostCenters)
            } catch {}
        }

        return NextResponse.json(
            {
                authenticated: true,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    name: user.name,
                    companyId: (user as any).companyId || null,
                    notificationPreferences: (user as any).notificationPreferences || null,
                    // Spy-specific fields — only present for ESPIAO role
                    permissions: parsedPermissions,
                    costCenters: parsedCostCenters,
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