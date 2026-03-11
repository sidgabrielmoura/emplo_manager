import db from "@/lib/prisma";
import { UserService } from "@/server/user.service";
import { compare, hash } from "bcrypt";
import { NextRequest, NextResponse } from "next/server";
import { getServerUserId, unauthorizedResponse, forbiddenResponse } from "@/lib/auth";

export async function PUT(req: NextRequest) {
    try {
        const sessionUserId = await getServerUserId(req)
        if (!sessionUserId) return unauthorizedResponse()

        const body = await req.json()
        const { currentPassword, newPassword, confirmPassword, userId } = body

        // Only allow updating own password
        if (sessionUserId !== userId) return forbiddenResponse()

        if (!currentPassword || !newPassword || !confirmPassword) {
            return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
        }

        if (newPassword !== confirmPassword) {
            return NextResponse.json({ error: "Senhas não coincidem" }, { status: 400 })
        }

        const user = await UserService.getUser(userId)

        if (!user) {
            return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
        }

        if (!user.password) {
            return NextResponse.json({ error: "Senha não encontrada" }, { status: 404 })
        }

        const isPasswordValid = await compare(currentPassword, user.password)

        if (!isPasswordValid) {
            return NextResponse.json({ error: "Senha atual inválida" }, { status: 401 })
        }

        const hashedPassword = await hash(newPassword, 10)

        await db.user.update({
            where: {
                id: userId
            },
            data: {
                password: hashedPassword
            }
        })

        return NextResponse.json({ message: "Senha atualizada com sucesso" }, { status: 200 })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: "Erro ao atualizar senha" }, { status: 500 })
    }
}