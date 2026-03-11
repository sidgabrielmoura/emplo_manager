import db from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, unauthorizedResponse, forbiddenResponse } from "@/lib/auth";

export async function DELETE(req: NextRequest) {
    try {
        const userSession = await getSessionUser(req) as any
        if (!userSession) return unauthorizedResponse()

        const { user_id } = await req.json()

        const targetUser = await db.user.findUnique({
            where: { id: user_id }
        })

        if (!targetUser) {
            return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
        }

        if (userSession.role !== "ADMIN" || userSession.companyId !== targetUser.companyId) {
            return forbiddenResponse()
        }

        const response = await db.user.delete({
            where: { id: user_id }
        })

        return NextResponse.json({ message: "Usuário deletado com sucesso", response }, { status: 200 })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: "Erro ao deletar usuário" }, { status: 500 })
    }
}