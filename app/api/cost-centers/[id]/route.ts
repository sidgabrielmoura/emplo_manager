import db from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    return NextResponse.json(costCenter)
  } catch (error: any) {
    console.error("Error in GET /api/cost-centers/[id]:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    await db.$disconnect()
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, city, state } = body

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
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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
