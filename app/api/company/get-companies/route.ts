import db from "@/lib/prisma"
import { getSessionUser, unauthorizedResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req)
    if (!user) return unauthorizedResponse()

    const companies = await db.company.findMany({
      where: user.role === 'SUPERADMIN' ? {} : {
        users: {
          some: { id: user.id }
        }
      },
      include: {
        employees: {
          include: {
            documents: true
          }
        },
        users: {
          where: { id: user.id },
          select: { role: true }
        }
      }
    })

    const response = companies.map(company => {
      const totalDocuments = company.employees.reduce(
        (acc, emp) =>
          acc + emp.documents.length,
        0
      )

      return {
        id: company.id,
        name: company.name,
        imageUrl: company.imageUrl,
        status: company.status,
        role: user.role === 'SUPERADMIN' ? 'SUPERADMIN' : company.users[0]?.role,
        totalEmployees: company.employees.length,
        totalDocuments
      }
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Erro ao buscar empresas" },
      { status: 500 }
    )
  }
}
