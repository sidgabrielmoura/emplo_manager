import db from "@/lib/prisma"
import { getServerUserId, getSessionUser, forbiddenResponse, unauthorizedResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

export async function POST(req: NextRequest) {
  try {
    const userId = await getServerUserId(req)
    if (!userId) return unauthorizedResponse()

    const currentUser = await getSessionUser(req)
    if (!currentUser || currentUser.role === "ESPIAO") {
      return forbiddenResponse()
    }

    const body = await req.json()
    const { name, email, observations, validDays, permissions, costCenters } = body

    if (!name || !email || !validDays || !permissions || !costCenters) {
      return NextResponse.json({ error: "Parâmetros obrigatórios ausentes" }, { status: 400 })
    }

    let companyId = currentUser.companyId
    if (currentUser.role === "SUPERADMIN") {
      companyId = body.companyId
    }

    if (!companyId) {
      return NextResponse.json({ error: "Empresa não associada ao usuário ou não especificada" }, { status: 400 })
    }

    // 1. Generate secure token
    const rawToken = crypto.randomBytes(32).toString("hex")
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex")

    // 2. Calculate expiration date
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + Number(validDays))

    // 3. Persist to DB
    const spyAccess = await db.spyAccess.create({
      data: {
        name,
        email,
        observations: observations || null,
        companyId,
        tokenHash,
        validDays: Number(validDays),
        expiresAt,
        permissions, // JSON object
        costCenters, // JSON array
        createdBy: currentUser.name || "Administrador"
      }
    })

    // Return spyAccess object AND the rawToken (only returned here on creation)
    return NextResponse.json({
      ...spyAccess,
      rawToken
    }, { status: 201 })
  } catch (error) {
    console.error("POST SPY CREATE ERROR:", error)
    return NextResponse.json({ error: "Erro interno ao criar acesso espião" }, { status: 500 })
  }
}
