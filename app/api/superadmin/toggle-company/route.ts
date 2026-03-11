import db from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { isSuperAdmin, forbiddenResponse } from "@/lib/auth"

export async function PUT(req: NextRequest) {
    try {
        const isSuper = await isSuperAdmin(req)
        if (!isSuper) return forbiddenResponse()

        const { companyId, action } = await req.json()

        if (!companyId || !action) {
            return NextResponse.json({ error: "companyId e action são obrigatórios" }, { status: 400 })
        }

        if (!["block", "unblock"].includes(action)) {
            return NextResponse.json({ error: "action inválida" }, { status: 400 })
        }

        const updated = await db.company.update({
            where: { id: companyId },
            data: { status: action === "block" ? "BLOCKED" : "ACTIVE" },
            select: { id: true, name: true, status: true }
        })

        return NextResponse.json(updated, { status: 200 })
    } catch (error) {
        console.error("[SUPERADMIN_TOGGLE_COMPANY]", error)
        return NextResponse.json({ error: "Erro ao atualizar empresa" }, { status: 500 })
    }
}
