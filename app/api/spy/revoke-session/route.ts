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
    const { sessionId } = body

    if (!sessionId) {
      return NextResponse.json({ error: "Sessão não informada" }, { status: 400 })
    }

    const session = await db.spySession.findUnique({
      where: { id: sessionId },
      include: { spyAccess: true }
    })

    if (!session) {
      return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 })
    }

    if (currentUser.role !== "SUPERADMIN" && session.spyAccess.companyId !== currentUser.companyId) {
      return forbiddenResponse()
    }

    // Revoke the session
    const updatedSession = await db.spySession.update({
      where: { id: sessionId },
      data: {
        status: "REVOKED",
        loggedOutAt: new Date()
      }
    })

    // Log the revocation event
    await logSpyAction({
      spyAccessId: session.spyAccessId,
      action: "BLOCKED_ATTEMPT",
      details: `Sessão específica revogada pelo administrador: ${currentUser.name}`
    })

    return NextResponse.json(updatedSession, { status: 200 })
  } catch (error) {
    console.error("POST SPY REVOKE SESSION ERROR:", error)
    return NextResponse.json({ error: "Erro interno ao revogar sessão" }, { status: 500 })
  }
}
