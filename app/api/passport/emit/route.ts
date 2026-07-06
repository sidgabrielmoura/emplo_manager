import db from "@/lib/prisma"
import { getServerUserId, unauthorizedResponse, validateCompanyAccess, forbiddenResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { EmailService } from "@/lib/emails/service"

export async function POST(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const { employeeId } = await req.json()

        if (!employeeId) {
            return NextResponse.json(
                { error: "ID do funcionário é obrigatório" },
                { status: 400 }
            )
        }

        const employee = await db.employee.findUnique({
            where: { id: employeeId },
            select: { companyId: true }
        })

        if (!employee) {
            return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 })
        }

        const hasAccess = await validateCompanyAccess(userId, employee.companyId)
        if (!hasAccess) return forbiddenResponse()

        const emission = await db.passportEmission.create({
            data: {
                employeeId
            },
            include: {
                employee: true
            }
        })

        // Notify company recipients and emitting admin
        try {
            const companyRecipients = await db.notificationRecipient.findMany({
                where: { companyId: employee.companyId }
            })

            const targets = companyRecipients.map(r => ({ email: r.email, name: r.name }))

            const adminUser = await db.user.findUnique({
                where: { id: userId }
            })
            if (adminUser) {
                targets.push({ email: adminUser.email, name: adminUser.name })
            }

            const uniqueTargets = Array.from(new Map(targets.map(t => [t.email, t])).values())

            for (const target of uniqueTargets) {
                await EmailService.sendPassportEmissionNotification({
                    to: target.email,
                    adminName: target.name,
                    employeeName: emission.employee.name,
                    companyId: employee.companyId
                })
            }
        } catch (mailErr) {
            console.error("Error sending passport emission email:", mailErr)
        }

        return NextResponse.json(emission, { status: 201 })
    } catch (error) {
        console.error("EMIT PASSPORT ERROR:", error)
        return NextResponse.json(
            { error: "Erro ao emitir passaporte" },
            { status: 500 }
        )
    }
}
