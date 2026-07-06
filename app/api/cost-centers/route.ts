import db from "@/lib/prisma"
import { getServerUserId, unauthorizedResponse, validateCompanyAccess, forbiddenResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { validateSpyAction } from "@/lib/spy-guard"

export async function POST(request: NextRequest) {
  try {
    const userId = await getServerUserId(request)
    if (!userId) return unauthorizedResponse()

    const body = await request.json()
    const { companyId, name, city, state, action } = body

    if (action === "list") {
      if (!companyId) {
        return NextResponse.json({ error: "ID da empresa é obrigatório" }, { status: 400 })
      }
      const hasAccess = await validateCompanyAccess(userId, companyId)
      if (!hasAccess) return forbiddenResponse()

      // Spy validation
      const spyValidation = await validateSpyAction(request, "cost-centers", "view")
      if (!spyValidation.authorized) {
        return NextResponse.json({ error: spyValidation.reason || "Não autorizado" }, { status: 403 })
      }

      const costCenters = await db.costCenter.findMany({
        where: { companyId },
        include: {
          _count: {
            select: { employees: true }
          }
        }
      })

      const sortedCostCenters = [...costCenters].sort((a, b) => {
        // Favorited first
        if (a.isFavorite && !b.isFavorite) return -1
        if (!a.isFavorite && b.isFavorite) return 1

        if (a.isFavorite && b.isFavorite) {
          const timeA = a.favoritedAt ? new Date(a.favoritedAt).getTime() : 0
          const timeB = b.favoritedAt ? new Date(b.favoritedAt).getTime() : 0
          return timeB - timeA
        }

        // Non-favorited: from most collaborators to least
        const empCountA = a._count?.employees ?? 0
        const empCountB = b._count?.employees ?? 0
        if (empCountA !== empCountB) {
          return empCountB - empCountA
        }

        return a.name.localeCompare(b.name)
      })

      return NextResponse.json(sortedCostCenters)
    }

    if (action === "toggle-favorite") {
      const { id } = body
      if (!id) {
        return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 })
      }

      const current = await db.costCenter.findUnique({
        where: { id }
      })

      if (!current) {
        return NextResponse.json({ error: "Centro de custo não encontrado" }, { status: 404 })
      }

      const hasAccess = await validateCompanyAccess(userId, current.companyId)
      if (!hasAccess) return forbiddenResponse()

      // Spy validation
      const spyValidation = await validateSpyAction(request, "cost-centers", "edit")
      if (!spyValidation.authorized) {
        return NextResponse.json({ error: spyValidation.reason || "Não autorizado" }, { status: 403 })
      }

      if (spyValidation.isSpy) {
        const spyCcIds = spyValidation.costCenters || []
        if (spyCcIds.length > 0 && !spyCcIds.includes(id)) {
          return NextResponse.json({ error: "Acesso não autorizado a este Centro de Custo" }, { status: 403 })
        }
      }

      const nextFav = !current.isFavorite
      const updated = await db.costCenter.update({
        where: { id },
        data: {
          isFavorite: nextFav,
          favoritedAt: nextFav ? new Date() : null
        },
        include: {
          _count: {
            select: { employees: true }
          }
        }
      })

      return NextResponse.json(updated)
    }

    // Create cost center action
    if (!name || !companyId) {
      return NextResponse.json({ error: "Nome e ID da empresa são obrigatórios" }, { status: 400 })
    }

    const hasAccess = await validateCompanyAccess(userId, companyId)
    if (!hasAccess) return forbiddenResponse()

    // Spy validation
    const spyValidation = await validateSpyAction(request, "cost-centers", "edit")
    if (!spyValidation.authorized) {
      return NextResponse.json({ error: spyValidation.reason || "Não autorizado" }, { status: 403 })
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
