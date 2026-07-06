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
    const companyId = currentUser.companyId || searchParams.get("companyId")
    if (!companyId) {
      return NextResponse.json({ error: "Empresa não informada" }, { status: 400 })
    }

    // Filter params
    const status = searchParams.get("status")
    const search = searchParams.get("search")

    const whereClause: any = {
      companyId
    }

    if (status && status !== "ALL") {
      whereClause.status = status
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } }
      ]
    }

    const spyAccesses = await db.spyAccess.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        sessions: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    })

    return NextResponse.json(spyAccesses, { status: 200 })
  } catch (error) {
    console.error("GET SPY LIST ERROR:", error)
    return NextResponse.json({ error: "Erro interno ao buscar espiões" }, { status: 500 })
  }
}
