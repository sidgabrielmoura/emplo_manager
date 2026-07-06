import db from "@/lib/prisma"
import { getSessionUser, forbiddenResponse, unauthorizedResponse, getServerUserId } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getServerUserId(req)
    if (!userId) return unauthorizedResponse()

    const currentUser = await getSessionUser(req)
    if (!currentUser || (currentUser.role as string) === "ESPIAO") {
      return forbiddenResponse()
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID do espião não informado" }, { status: 400 })
    }

    const spyAccess = await db.spyAccess.findUnique({ where: { id } })

    if (!spyAccess) {
      return NextResponse.json({ error: "Registro não encontrado" }, { status: 404 })
    }

    if ((currentUser as any).role !== "SUPERADMIN" && spyAccess.companyId !== (currentUser as any).companyId) {
      return forbiddenResponse()
    }

    // Cascade: revoke all active sessions first, then delete logs, sessions and the record
    await db.spySession.updateMany({
      where: { spyAccessId: id, status: "ACTIVE" },
      data: { status: "REVOKED", loggedOutAt: new Date() }
    })

    await db.spyLog.deleteMany({ where: { spyAccessId: id } })
    await db.spySession.deleteMany({ where: { spyAccessId: id } })
    await db.spyAccess.delete({ where: { id } })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("DELETE SPY ERROR:", error)
    return NextResponse.json({ error: "Erro interno ao deletar espião" }, { status: 500 })
  }
}
