import db from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { companyId, name, city, state, action } = body

    if (action === "list") {
      const costCenters = await db.costCenter.findMany({
        where: { companyId },
        include: {
          _count: {
            select: { employees: true }
          }
        },
        orderBy: { name: "asc" }
      })
      return NextResponse.json(costCenters)
    }

    if (!name || !companyId) {
      return NextResponse.json({ error: "Nome e ID da empresa são obrigatórios" }, { status: 400 })
    }

    const costCenter = await db.costCenter.create({
      data: {
        name,
        city,
        state,
        companyId
      },
      include: {
        _count: {
          select: { employees: true }
        }
      }
    })

    return NextResponse.json(costCenter)
  } catch (error: any) {
    console.error("Error in /api/cost-centers:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    await db.$disconnect()
  }
}
