import db from "@/lib/prisma"
import { getServerUserId, unauthorizedResponse, validateCompanyAccess, forbiddenResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { calculateDocumentDates } from "@/lib/docs"

export async function PUT(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const body = await req.json()
        const trainingId = body.id

        if (!body.fileUrl && !body.clear && body.name === undefined && body.position === undefined && body.isEnabled === undefined) {
            return NextResponse.json({ error: 'Parâmetro inválido' }, { status: 400 })
        }

        const isVirtual = trainingId && trainingId.startsWith('virtual-')

        if (isVirtual) {
            if (body.clear) {
                return NextResponse.json({ success: true })
            }

            const requirementId = trainingId.replace('virtual-', '')
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

            if (body.fileUrl && (!issuedAt || !expiresAt)) {
                const dates = await calculateDocumentDates({
                    companyId: employee.companyId,
                    type: 'CUSTOM',
                    name: requirement.name,
                    requirementId: requirementId
                })
                issuedAt = dates.issuedAt
                expiresAt = dates.expiresAt
            }

            const response = await db.training.upsert({
                where: {
                    employeeId_type_name: {
                        employeeId: body.employeeId,
                        type: 'CUSTOM',
                        name: requirement.name
                    }
                },
                update: {
                    fileUrl: body.fileUrl !== undefined ? body.fileUrl : undefined,
                    expiresAt: expiresAt || undefined,
                    issuedAt: issuedAt || undefined,
                    status: body.fileUrl !== undefined ? (body.status || 'APPROVED') : undefined,
                    name: body.name !== undefined ? body.name : undefined,
                    position: body.position !== undefined ? body.position : undefined,
                    isEnabled: body.isEnabled !== undefined ? body.isEnabled : undefined,
                    deletedAt: null
                },
                create: {
                    employeeId: body.employeeId,
                    type: 'CUSTOM',
                    name: body.name !== undefined ? body.name : requirement.name,
                    fileUrl: body.fileUrl || null,
                    expiresAt: expiresAt,
                    issuedAt: issuedAt,
                    status: body.fileUrl ? (body.status || 'APPROVED') : 'PENDING',
                    isEnabled: body.isEnabled !== undefined ? body.isEnabled : true,
                    position: body.position !== undefined ? body.position : requirement.position
                }
            })

            return NextResponse.json(response)
        }

        const trainingData = await db.training.findUnique({
            where: { id: trainingId },
            include: { employee: { select: { companyId: true } } }
        })

        if (!trainingData || !trainingData.employee) {
            return NextResponse.json({ error: "Treinamento ou funcionário não encontrado" }, { status: 404 })
        }

        const hasAccess = await validateCompanyAccess(userId, trainingData.employee.companyId)
        if (!hasAccess) return forbiddenResponse()

        let issuedAt = body.issuedAt ? new Date(body.issuedAt) : null
        let expiresAt = body.expiresAt ? new Date(body.expiresAt) : null

        if (body.clear) {
            const training = await db.training.update({
                where: { id: trainingId },
                data: {
                    status: 'PENDING',
                    fileUrl: null,
                    issuedAt: null,
                    expiresAt: null,
                    deletedAt: null
                }
            })
            return NextResponse.json(training)
        }

        if (body.fileUrl && (!issuedAt || !expiresAt)) {
            const dates = await calculateDocumentDates({
                companyId: trainingData.employee.companyId,
                type: (trainingData as any).type,
                name: (trainingData as any).name
            })
            issuedAt = dates.issuedAt
            expiresAt = dates.expiresAt
        }

        const dataToUpdate: any = {}
        if (body.fileUrl !== undefined) {
            dataToUpdate.fileUrl = body.fileUrl
            dataToUpdate.status = body.status || 'APPROVED'
            dataToUpdate.deletedAt = null
        }
        if (issuedAt !== null) dataToUpdate.issuedAt = issuedAt
        if (expiresAt !== null) dataToUpdate.expiresAt = expiresAt
        if (body.name !== undefined) dataToUpdate.name = body.name
        if (body.position !== undefined) dataToUpdate.position = body.position
        if (body.isEnabled !== undefined) dataToUpdate.isEnabled = body.isEnabled

        const training = await db.training.update({
            where: { id: trainingId },
            data: dataToUpdate
        })

        return NextResponse.json(training)
    } catch (error) {
        console.error("UPDATE TRAINING ERROR:", error)
        return NextResponse.json({ error: 'Erro ao atualizar treinamento' }, { status: 500 })
    }
}
