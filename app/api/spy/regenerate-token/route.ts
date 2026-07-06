import db from "@/lib/prisma"
import { getSessionUser, forbiddenResponse, unauthorizedResponse, getServerUserId } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

export async function POST(req: NextRequest) {
  try {
    const userId = await getServerUserId(req)
    if (!userId) return unauthorizedResponse()

    const currentUser = await getSessionUser(req)
    if (!currentUser || (currentUser.role as string) === "ESPIAO") {
      return forbiddenResponse()
    }

    const body = await req.json()
    const { id } = body

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

    // Revoke all current active sessions so old links stop working immediately
    await db.spySession.updateMany({
      where: { spyAccessId: id, status: "ACTIVE" },
      data: { status: "REVOKED", loggedOutAt: new Date() }
    })

    // Generate a fresh token
    const rawToken = crypto.randomBytes(32).toString("hex")
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex")

    // Update the record with the new hash and reactivate if expired
    const updated = await db.spyAccess.update({
      where: { id },
      data: {
        tokenHash,
        status: spyAccess.expiresAt > new Date() ? "ACTIVE" : spyAccess.status
      }
    })

    return NextResponse.json({ ...updated, rawToken }, { status: 200 })
  } catch (error) {
    console.error("POST SPY REGENERATE TOKEN ERROR:", error)
    return NextResponse.json({ error: "Erro interno ao regenerar link" }, { status: 500 })
  }
}
