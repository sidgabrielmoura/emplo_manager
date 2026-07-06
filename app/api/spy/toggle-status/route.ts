import db from "@/lib/prisma"
import { getServerUserId, getSessionUser, forbiddenResponse, unauthorizedResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { logSpyAction } from "@/lib/spy-guard"

export async function POST(req: NextRequest) {
  try {
    const userId = await getServerUserId(req)
    if (!userId) return unauthorizedResponse()

    const currentUser = await getSessionUser(req)
    if (!currentUser || currentUser.role === "ESPIAO") {
      return forbiddenResponse()
    }

    const body = await req.json()
    const { id, status } = body

    if (!id || !status || !["ACTIVE", "BLOCKED"].includes(status)) {
      return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 })
    }

    const currentSpy = await db.spyAccess.findUnique({
      where: { id }
    })

    if (!currentSpy) {
      return NextResponse.json({ error: "Registro não encontrado" }, { status: 404 })
    }

    if (currentUser.role !== "SUPERADMIN" && currentSpy.companyId !== currentUser.companyId) {
      return forbiddenResponse()
    }

    // Update status
    const updated = await db.spyAccess.update({
      where: { id },
      data: { status }
    })

    // If blocked, terminate all active sessions immediately
    if (status === "BLOCKED") {
      await db.spySession.updateMany({
        where: { spyAccessId: id, status: "ACTIVE" },
        data: { status: "REVOKED", loggedOutAt: new Date() }
      })

      // Log revoking
      await logSpyAction({
        spyAccessId: id,
        action: "BLOCKED_ATTEMPT",
        details: `Sessões ativas revogadas e acesso bloqueado pelo administrador: ${currentUser.name}`
      })
    } else {
      await logSpyAction({
        spyAccessId: id,
        action: "PAGE_ACCESS", // generic log action
        details: `Acesso reativado pelo administrador: ${currentUser.name}`
      })
    }

    return NextResponse.json(updated, { status: 200 })
  } catch (error) {
    console.error("POST SPY TOGGLE STATUS ERROR:", error)
    return NextResponse.json({ error: "Erro interno ao alterar status" }, { status: 500 })
  }
}
