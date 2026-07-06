import db from "@/lib/prisma"
import { getServerUserId, getSessionUser, forbiddenResponse, unauthorizedResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const userId = await getServerUserId(req)
    if (!userId) return unauthorizedResponse()

    const currentUser = await getSessionUser(req)
    if (!currentUser || currentUser.role === "ESPIAO") {
      return forbiddenResponse()
    }

    const body = await req.json()
    const { id, name, email, observations, validDays, permissions, costCenters } = body

    if (!id || !name || !email || !validDays || !permissions || !costCenters) {
      return NextResponse.json({ error: "Parâmetros obrigatórios ausentes" }, { status: 400 })
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

    // Recalculate expiration date based on createdAt and new validDays
    const expiresAt = new Date(currentSpy.createdAt)
    expiresAt.setDate(expiresAt.getDate() + Number(validDays))

    // Determine status: if it was expired but now has validity, set to ACTIVE
    let status = currentSpy.status
    if (status === "EXPIRED" && expiresAt > new Date()) {
      status = "ACTIVE"
    }

    const updated = await db.spyAccess.update({
      where: { id },
      data: {
        name,
        email,
        observations: observations || null,
        validDays: Number(validDays),
        expiresAt,
        status,
        permissions,
        costCenters
      }
    })

    return NextResponse.json(updated, { status: 200 })
  } catch (error) {
    console.error("POST SPY UPDATE ERROR:", error)
    return NextResponse.json({ error: "Erro interno ao atualizar espião" }, { status: 500 })
  }
}
