import db from "@/lib/prisma";
import { getServerUserId, unauthorizedResponse, validateCompanyAccess, forbiddenResponse } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { calculateDocumentDates } from "@/lib/docs";


export async function PUT(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const body = await req.json()

        if (!body.fileUrl && !body.clear) {
            return NextResponse.json({ error: 'url do arquivo não encontrada' }, { status: 400 })
        }

        const isVirtual = body.id && body.id.startsWith('virtual-')

        if (isVirtual) {
            if (body.clear) {
                return NextResponse.json({ success: true })
            }

            const requirementId = body.id.replace('virtual-', '')
            const requirement = await db.companyRequiredDocument.findUnique({
                where: { id: requirementId }
            })

            if (!requirement) {
                return NextResponse.json({ error: "Requisito não encontrado" }, { status: 404 })
            }

            const employee = await db.employee.findUnique({
                where: { id: body.employeeId },
                select: { companyId: true }
            })

            if (!employee) {
                return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 })
            }

            const hasAccess = await validateCompanyAccess(userId, employee.companyId)
            if (!hasAccess) return forbiddenResponse()

            let issuedAt = body.issuedAt ? new Date(body.issuedAt) : null
            let expiresAt = body.expiresAt ? new Date(body.expiresAt) : null

            if (!issuedAt || !expiresAt) {
                const dates = await calculateDocumentDates({
                    companyId: employee.companyId,
                    type: 'CUSTOM',
                    name: requirement.name,
                    requirementId: requirementId
                })
                issuedAt = dates.issuedAt
                expiresAt = dates.expiresAt
            }

            const response = await db.document.upsert({
                where: {
                    employeeId_type_name: {
                        employeeId: body.employeeId,
                        type: 'CUSTOM',
                        name: requirement.name
                    }
                },
                update: {
                    fileUrl: body.fileUrl,
                    expiresAt,
                    issuedAt,
                    status: 'APPROVED',
                    deletedAt: null
                },
                create: {
                    employeeId: body.employeeId,
                    type: 'CUSTOM',
                    name: requirement.name,
                    fileUrl: body.fileUrl,
                    expiresAt,
                    issuedAt,
                    status: 'APPROVED'
                }
            })

            return NextResponse.json(response)
        }

        const document = await db.document.findUnique({
            where: { id: body.id },
            include: { employee: { select: { companyId: true } } }
        })

        if (!document || !document.employee) {
            return NextResponse.json({ error: "Documento ou funcionário não encontrado" }, { status: 404 })
        }

        const hasAccess = await validateCompanyAccess(userId, document.employee.companyId)
        if (!hasAccess) return forbiddenResponse()

        let issuedAt = body.issuedAt ? new Date(body.issuedAt) : null
        let expiresAt = body.expiresAt ? new Date(body.expiresAt) : null

        if (body.clear) {
            const response = await db.document.update({
                where: {
                    id: body.id
                },
                data: {
                    fileUrl: null,
                    expiresAt: null,
                    issuedAt: null,
                    status: 'PENDING'
                }
            })
            return NextResponse.json(response)
        }

        if (!issuedAt || !expiresAt) {
            const dates = await calculateDocumentDates({
                companyId: document.employee.companyId,
                type: (document as any).type,
                name: (document as any).name
            })
            issuedAt = dates.issuedAt
            expiresAt = dates.expiresAt
        }

        const response = await db.document.update({
            where: {
                id: body.id
            },
            data: {
                fileUrl: body.fileUrl,
                expiresAt,
                issuedAt,
                status: 'APPROVED',
                deletedAt: null
            }
        })

        return NextResponse.json(response)
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
