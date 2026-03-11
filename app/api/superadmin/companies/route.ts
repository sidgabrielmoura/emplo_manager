import db from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { isSuperAdmin, forbiddenResponse } from "@/lib/auth"

export async function GET(req: NextRequest) {
    try {
        const isSuper = await isSuperAdmin(req)
        if (!isSuper) return forbiddenResponse()

        const companies = await db.company.findMany({
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                name: true,
                imageUrl: true,
                cnpj: true,
                email: true,
                phone: true,
                address: true,
                state: true,
                city: true,
                responsible: true,
                status: true,
                createdAt: true,
                _count: {
                    select: { employees: true }
                }
            }
        })

        return NextResponse.json(companies, { status: 200 })
    } catch (error) {
        console.error("[SUPERADMIN_GET_COMPANIES]", error)
        return NextResponse.json({ error: "Erro ao carregar empresas" }, { status: 500 })
    }
}
