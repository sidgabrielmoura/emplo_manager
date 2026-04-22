import db from "@/lib/prisma"
import bcrypt from "bcrypt"
import { NextRequest, NextResponse } from "next/server"
import { isSuperAdmin, forbiddenResponse } from "@/lib/auth"


export async function GET(req: NextRequest) {
    try {
        const isSuper = await isSuperAdmin(req)
        if (!isSuper) return forbiddenResponse()

        const users = await db.user.findMany({
            include: {
                company: {
                    select: { id: true, name: true, imageUrl: true }
                }
            },
            orderBy: { createdAt: "desc" }
        })

        return NextResponse.json(users, { status: 200 })
    } catch (error) {
        console.error("[SUPERADMIN_GET_USERS]", error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}


export async function PUT(req: NextRequest) {
    try {
        const isSuper = await isSuperAdmin(req)
        if (!isSuper) return forbiddenResponse()

        const body = await req.json()
        const { userId, name, email, role, newPassword } = body

        if (!userId) {
            return NextResponse.json({ error: "userId é obrigatório" }, { status: 400 })
        }

        const updateData: any = {}
        if (name) updateData.name = name
        if (email) updateData.email = email
        if (role) updateData.role = role
        if (newPassword) {
            const hashed = await bcrypt.hash(newPassword, 10)
            updateData.password = hashed
        }

        const updated = await db.user.update({
            where: { id: userId },
            data: updateData,
            include: {
                company: { select: { id: true, name: true } }
            }
        })

        return NextResponse.json(updated, { status: 200 })
    } catch (error) {
        console.error("[SUPERADMIN_UPDATE_USER]", error)
        return NextResponse.json({ error: "Erro ao atualizar usuário" }, { status: 500 })
    }
}


export async function DELETE(req: NextRequest) {
    try {
        const isSuper = await isSuperAdmin(req)
        if (!isSuper) return forbiddenResponse()

        const body = await req.json()
        const { userId } = body

        if (!userId) {
            return NextResponse.json({ error: "userId é obrigatório" }, { status: 400 })
        }

        await db.user.delete({ where: { id: userId } })

        return NextResponse.json({ message: "Usuário deletado com sucesso" }, { status: 200 })
    } catch (error) {
        console.error("[SUPERADMIN_DELETE_USER]", error)
        return NextResponse.json({ error: "Erro ao deletar usuário" }, { status: 500 })
    }
}
