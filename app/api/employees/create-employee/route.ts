import { DocumentType, TrainingType } from "@/lib/generated/prisma/enums"
import db from "@/lib/prisma"
import { getServerUserId, unauthorizedResponse, validateCompanyAccess, forbiddenResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { EmailService } from "@/lib/emails/service"
import { validateSpyAction } from "@/lib/spy-guard"

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

        // Spy Validation
        const spyValidation = await validateSpyAction(req, "employees", "edit")
        if (!spyValidation.authorized) {
            return NextResponse.json({ error: spyValidation.reason || "Não autorizado" }, { status: 403 })
        }

        if (spyValidation.isSpy) {
            const spyCcIds = spyValidation.costCenters || []
            if (spyCcIds.length > 0) {
                if (body.costCenterId && !spyCcIds.includes(body.costCenterId)) {
                    return NextResponse.json({ error: "Você não tem permissão para associar funcionários a este Centro de Custo" }, { status: 403 })
                }
            }
        }

        const employee = await db.employee.create({
            data: {
                name: body.name,
                email: body.email.trim().toLowerCase(),
                cpf: body.cpf.trim().replace(/\D/g, ""),
                rg: body.rg,
                gender: body.gender,
                image: body.image,
                position: body.position,
                rotation: body.rotation,
                workStart: body.workStart,
                workEnd: body.workEnd,
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

        const defaultDocs = await db.companyRequiredDocument.findMany({
            where: {
                companyId: body.companyId,
                target: "EMPLOYEE_DOC",
                isEnabled: true
            }
        })

        if (defaultDocs.length > 0) {
            await db.document.createMany({
                data: defaultDocs.map((req) => ({
                    employeeId: employee.id,
                    type: "CUSTOM",
                    name: req.name,
                    isEnabled: true,
                    position: req.position
                })),
                skipDuplicates: true
            })
        }

        const defaultTrainings = await db.companyRequiredDocument.findMany({
            where: {
                companyId: body.companyId,
                target: "EMPLOYEE_TRAINING",
                isEnabled: true
            }
        })

        if (defaultTrainings.length > 0) {
            await db.training.createMany({
                data: defaultTrainings.map((req) => ({
                    employeeId: employee.id,
                    type: "CUSTOM",
                    name: req.name,
                    isEnabled: true,
                    position: req.position
                })),
                skipDuplicates: true
            })
        }


        try {
            const customRecipients = await db.notificationRecipient.findMany({
                where: {
                    companyId: body.companyId,
                    newEmployeeAlerts: true
                }
            })

            const allToNotify = customRecipients.map(c => ({
                name: c.name,
                email: c.email.trim().toLowerCase()
            }))

            // Send notifications in the background
            Promise.all(allToNotify.map(target => {
                return EmailService.sendNewEmployeeNotification({
                    to: target.email,
                    adminName: target.name,
                    employeeName: employee.name,
                    position: employee.position,
                    companyId: body.companyId
                })
            })).catch(err => {
                console.error("BACKGROUND EMAIL SEND ERROR:", err)
            })
        } catch (emailError) {
            console.error("FAILED TO INITIATE NEW EMPLOYEE EMAILS:", emailError)
        }

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