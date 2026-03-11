import db from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { isSuperAdmin, forbiddenResponse } from "@/lib/auth"

export async function GET(req: NextRequest) {
    try {
        const isSuper = await isSuperAdmin(req)
        if (!isSuper) return forbiddenResponse()

        const [
            totalCompanies,
            activeCompanies,
            blockedCompanies
        ] = await Promise.all([
            db.company.count(),
            db.company.count({ where: { status: "ACTIVE" } }),
            db.company.count({ where: { status: "BLOCKED" } })
        ])

        const totalEmployees = await db.employee.count()

        const [
            approvedDocs,
            pendingDocs,
            expiredDocs
        ] = await Promise.all([
            db.document.count({ where: { status: "APPROVED" } }),
            db.document.count({ where: { status: "PENDING" } }),
            db.document.count({ where: { status: "EXPIRED" } })
        ])

        const recentCompanies = await db.company.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
                id: true,
                name: true,
                imageUrl: true,
                status: true,
                createdAt: true,
                _count: {
                    select: { employees: true }
                }
            }
        })

        return NextResponse.json({
            stats: {
                companies: {
                    total: totalCompanies,
                    active: activeCompanies,
                    blocked: blockedCompanies
                },
                employees: {
                    total: totalEmployees
                },
                documents: {
                    approved: approvedDocs,
                    pending: pendingDocs,
                    expired: expiredDocs
                }
            },
            recentCompanies
        })
    } catch (error) {
        console.error(error)
        return NextResponse.json(
            { error: "Erro ao carregar dashboard do superadmin" },
            { status: 500 }
        )
    }
}
