import { DocumentType, TrainingType } from "@/lib/generated/prisma/enums"
import db from "@/lib/prisma"
import { getServerUserId, unauthorizedResponse, validateCompanyAccess, forbiddenResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const body = await req.json()

        if (!body.name || !body.cpf || !body.companyId || !body.email) {
            return NextResponse.json(
                { error: "Dados obrigatórios ausentes" },
                { status: 400 }
            )
        }

        if (!body.image) {
            return NextResponse.json(
                { error: "Imagem do funcionário ausente" },
                { status: 400 }
            )
        }

        const hasAccess = await validateCompanyAccess(userId, body.companyId)
        if (!hasAccess) return forbiddenResponse()

        const employee = await db.employee.create({
            data: {
                name: body.name,
                email: body.email,
                cpf: body.cpf,
                rg: body.rg,
                gender: body.gender,
                image: body.image,
                position: body.position,
                rotation: body.rotation,
                birthDate: new Date(body.birthDate),

                companyId: body.companyId,

                contact: {
                    create: {
                        phone: body.contact || null,
                        emergencyContact: body.emergencyContact || null
                    }
                },

                address: {
                    create: {
                        cep: body.cep || null,
                        address: body.address || null,
                        number: body.number || null,
                        city: body.city || null,
                        district: body.district || null,
                        complement: body.complement || null
                    }
                },

                contract: body.admissionDate
                    ? {
                        create: {
                            startDate: new Date(body.admissionDate),
                            endDate: body.contractEndDate
                                ? new Date(body.contractEndDate)
                                : null
                        }
                    }
                    : undefined
            },

            include: {
                contact: true,
                address: true,
                contract: true
            }
        })

        await db.document.createMany({
            data: Object.values(DocumentType).map((type) => ({
                employeeId: employee.id,
                type
            })),
            skipDuplicates: true
        })

        await db.training.createMany({
            data: Object.values(TrainingType).map((type) => ({
                employeeId: employee.id,
                type
            })),
            skipDuplicates: true
        })

        return NextResponse.json(employee)
    } catch (error: any) {

        if (error.code === "P2002") {
            return NextResponse.json(
                { error: "CPF ou email já cadastrados" },
                { status: 409 }
            )
        }

        console.error("CREATE EMPLOYEE ERROR:", error)

        return NextResponse.json(
            { error: "Erro interno" },
            { status: 500 }
        )
    }
}