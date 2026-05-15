import db from "@/lib/prisma"
import { getServerUserId, unauthorizedResponse, validateCompanyAccess, forbiddenResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const employeeId = body.id

        const employee = await db.employee.findFirst({
            where: { id: employeeId },
            include: {
                contact: true,
                address: true,
                contract: true,
                trainings: true,
                documents: true,
                costCenter: true,
                company: {
                    select: {
                        id: true,
                        name: true,
                        imageUrl: true
                    }
                }
            }
        })

        if (!employee) {
            return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 })
        }

        return NextResponse.json(employee)
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}