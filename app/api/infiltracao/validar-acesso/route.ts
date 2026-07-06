import db from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import jwt from "jsonwebtoken"
import { parseUserAgent } from "@/helpers/ua"
import { getClientIp, logSpyAction } from "@/lib/spy-guard"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token } = body

    if (!token) {
      return NextResponse.json({ success: false, error: "token_missing" }, { status: 400 })
    }

    // 1. Calculate SHA-256 of the token to find the SpyAccess record
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex")

    const spyAccess = await db.spyAccess.findUnique({
      where: { tokenHash }
    })

    if (!spyAccess) {
      return NextResponse.json({ success: false, error: "not_found" }, { status: 404 })
    }

    // 2. Validate current status
    if (spyAccess.status === "BLOCKED") {
      return NextResponse.json({ success: false, error: "blocked" }, { status: 403 })
    }

    if (spyAccess.status === "EXPIRED") {
      return NextResponse.json({ success: false, error: "expired" }, { status: 403 })
    }

    // 3. Validate expiration date
    const now = new Date()
    if (new Date(spyAccess.expiresAt) <= now) {
      // Self-healing: update status to EXPIRED in database
      await db.spyAccess.update({
        where: { id: spyAccess.id },
        data: { status: "EXPIRED" }
      })
      await db.spySession.updateMany({
        where: { spyAccessId: spyAccess.id, status: "ACTIVE" },
        data: { status: "EXPIRED", loggedOutAt: now }
      })
      
      // Log expiration event
      await logSpyAction({
        spyAccessId: spyAccess.id,
        action: "EXPIRED_ATTEMPT",
        details: "Tentativa de login bloqueada: Acesso expirado temporalmente (validado na API)",
        ip: getClientIp(req)
      })

      return NextResponse.json({ success: false, error: "expired" }, { status: 403 })
    }

    // 4. Single Session Constraint: Revoke all previous active sessions
    await db.spySession.updateMany({
      where: { spyAccessId: spyAccess.id, status: "ACTIVE" },
      data: { status: "REVOKED", loggedOutAt: now }
    })

    // 5. Gather client metadata
    const userAgentStr = req.headers.get("user-agent")
    const { browser, os, device } = parseUserAgent(userAgentStr)
    const ip = getClientIp(req)
    const country = req.headers.get("x-vercel-ip-country") || null
    const city = req.headers.get("x-vercel-ip-city") || null

    // Generate unique session token
    const sessionTokenUuid = crypto.randomUUID()

    // 6. Create SpySession in DB
    const spySession = await db.spySession.create({
      data: {
        spyAccessId: spyAccess.id,
        token: sessionTokenUuid,
        ip,
        userAgent: userAgentStr,
        browser,
        os,
        device,
        city,
        country
      }
    })

    // Update last access time on SpyAccess
    await db.spyAccess.update({
      where: { id: spyAccess.id },
      data: { lastAccessAt: now }
    })

    // Log successful login
    await logSpyAction({
      spyAccessId: spyAccess.id,
      action: "LOGIN",
      details: `Login efetuado com sucesso (validado na API - OS: ${os}, Browser: ${browser}, Dispositivo: ${device})`,
      ip
    })

    // 7. Sign JWT token for the spy session
    const jwtToken = jwt.sign(
      {
        sub: spyAccess.id,
        email: spyAccess.email,
        name: spyAccess.name,
        role: "ESPIAO",
        sessionId: spySession.id
      },
      process.env.JWT_SECRET || "super_secret",
      { expiresIn: `${spyAccess.validDays}d` }
    )

    // 8. Set cookie and return success
    const response = NextResponse.json({ success: true })

    response.cookies.set("spy_access_token", jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * spyAccess.validDays
    })

    return response
  } catch (error) {
    console.error("POST VALIDATE SPY ACCESS ERROR:", error)
    return NextResponse.json({ success: false, error: "internal_error" }, { status: 500 })
  }
}
