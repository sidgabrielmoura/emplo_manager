import db from "@/lib/prisma"
import { getServerUserId, getSessionUser, forbiddenResponse, unauthorizedResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const userId = await getServerUserId(req)
    if (!userId) return unauthorizedResponse()

    const currentUser = await getSessionUser(req)
    if (!currentUser || currentUser.role === "ESPIAO") {
      return forbiddenResponse()
    }

    const { searchParams } = new URL(req.url)
    const spyAccessId = searchParams.get("spyAccessId")

    if (!spyAccessId) {
      return NextResponse.json({ error: "ID do espião não informado" }, { status: 400 })
    }

    const spyAccess = await db.spyAccess.findUnique({
      where: { id: spyAccessId }
    })

    if (!spyAccess) {
      return NextResponse.json({ error: "Registro não encontrado" }, { status: 404 })
    }

    if (currentUser.role !== "SUPERADMIN" && spyAccess.companyId !== currentUser.companyId) {
      return forbiddenResponse()
    }

    // Fetch logs and sessions
    const logs = await db.spyLog.findMany({
      where: { spyAccessId },
      orderBy: { createdAt: "desc" }
    })

    const sessions = await db.spySession.findMany({
      where: { spyAccessId },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json({ logs, sessions }, { status: 200 })
  } catch (error) {
    console.error("GET SPY LOGS ERROR:", error)
    return NextResponse.json({ error: "Erro interno ao buscar logs do espião" }, { status: 500 })
  }
}
