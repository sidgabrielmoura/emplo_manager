import { getSessionUser, unauthorizedResponse, forbiddenResponse } from "@/lib/auth"
import { getClientIp, logSpyAction } from "@/lib/spy-guard"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user) return unauthorizedResponse()

    if (user.role !== "ESPIAO") {
      return forbiddenResponse()
    }

    const body = await req.json()
    const { action, details } = body

    if (!action) {
      return NextResponse.json({ error: "Ação não informada" }, { status: 400 })
    }

    await logSpyAction({
      spyAccessId: user.id,
      action,
      details: details || null,
      ip: getClientIp(req)
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("POST LOG REGISTER ERROR:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
