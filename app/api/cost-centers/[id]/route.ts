import db from "@/lib/prisma"
import { getServerUserId, unauthorizedResponse, validateCompanyAccess, forbiddenResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { validateSpyAction } from "@/lib/spy-guard"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getServerUserId(request)
    if (!userId) return unauthorizedResponse()

    const { id } = await params

    const costCenter = await db.costCenter.findUnique({
      where: { id },
      include: {
        employees: {
          select: {
            id: true,
            name: true,
            email: true,
            position: true,
            status: true,
            image: true
          }
        },
        _count: {
          select: { employees: true }
        }
      }
    })

    if (!costCenter) {
      return NextResponse.json({ error: "Centro de custo não encontrado" }, { status: 404 })
    }

    const hasAccess = await validateCompanyAccess(userId, costCenter.companyId)
    if (!hasAccess) return forbiddenResponse()

    // Spy validation
    const spyValidation = await validateSpyAction(request, "cost-centers", "view")
    if (!spyValidation.authorized) {
      return NextResponse.json({ error: spyValidation.reason || "Não autorizado" }, { status: 403 })
    }

    if (spyValidation.isSpy) {
      const spyCcIds = spyValidation.costCenters || []
      if (!spyCcIds.includes(id)) {
        return NextResponse.json({ error: "Acesso não autorizado a este Centro de Custo" }, { status: 403 })
      }
    }

    return NextResponse.json(costCenter)
  } catch (error: any) {
    console.error("Error in GET /api/cost-centers/[id]:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    await db.$disconnect()
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getServerUserId(request)
    if (!userId) return unauthorizedResponse()

    const { id } = await params
    const body = await request.json()
    const { name, city, state } = body

    const existing = await db.costCenter.findUnique({
      where: { id }
    })

    if (!existing) {
      return NextResponse.json({ error: "Centro de custo não encontrado" }, { status: 404 })
    }

    const hasAccess = await validateCompanyAccess(userId, existing.companyId)
    if (!hasAccess) return forbiddenResponse()

    // Spy validation
    const spyValidation = await validateSpyAction(request, "cost-centers", "edit")
    if (!spyValidation.authorized) {
      return NextResponse.json({ error: spyValidation.reason || "Não autorizado" }, { status: 403 })
    }

    if (spyValidation.isSpy) {
      const spyCcIds = spyValidation.costCenters || []
      if (!spyCcIds.includes(id)) {
        return NextResponse.json({ error: "Acesso não autorizado a este Centro de Custo" }, { status: 403 })
      }
    }

    const costCenter = await db.costCenter.update({
      where: { id },
      data: {
        name,
        city,
        state
      },
      include: {
        _count: {
          select: { employees: true }
        }
      }
    })

    return NextResponse.json(costCenter)
  } catch (error: any) {
    console.error("Error in PUT /api/cost-centers/[id]:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    await db.$disconnect()
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getServerUserId(request)
    if (!userId) return unauthorizedResponse()

    const { id } = await params

    const existing = await db.costCenter.findUnique({
      where: { id }
    })

    if (!existing) {
      return NextResponse.json({ error: "Centro de custo não encontrado" }, { status: 404 })
    }

    const hasAccess = await validateCompanyAccess(userId, existing.companyId)
    if (!hasAccess) return forbiddenResponse()

    // Spy validation
    const spyValidation = await validateSpyAction(request, "cost-centers", "edit")
    if (!spyValidation.authorized) {
      return NextResponse.json({ error: spyValidation.reason || "Não autorizado" }, { status: 403 })
    }

    if (spyValidation.isSpy) {
      const spyCcIds = spyValidation.costCenters || []
      if (!spyCcIds.includes(id)) {
        return NextResponse.json({ error: "Acesso não autorizado a este Centro de Custo" }, { status: 403 })
      }
    }

    await db.costCenter.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error in DELETE /api/cost-centers/[id]:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    await db.$disconnect()
  }
}
