import db from "@/lib/prisma"
import { getServerUserId, unauthorizedResponse, validateCompanyAccess, forbiddenResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { updateExpiredStatuses } from "@/lib/docs"

export async function POST(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const body = await req.json()
        const employeeId = body.employee_id

        if (!employeeId) {
            return NextResponse.json({ error: "employee_id é obrigatório" }, { status: 400 })
        }

        const employee = await db.employee.findUnique({
            where: { id: employeeId },
            select: { 
                companyId: true,
                company: { select: { disabledDocuments: true } }
            }
        })
 
        if (!employee) {
            return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 })
        }
 
        const hasAccess = await validateCompanyAccess(userId, employee.companyId)
        if (!hasAccess) return forbiddenResponse()
 
        // Update expired statuses for the company before fetching
        await updateExpiredStatuses(employee.companyId)
 
        const [trainings, requirements] = await Promise.all([
            db.training.findMany({
                where: {
                    employeeId: employeeId,
                    deletedAt: null
                },
                orderBy: {
                    updatedAt: "desc",
                }
            }),
            db.companyRequiredDocument.findMany({
                where: {
                    companyId: employee.companyId,
                    target: "EMPLOYEE_TRAINING",
                    isEnabled: true
                }
            })
        ])
 
        // 1. Filter real trainings to exclude orphans
        // and also filter out standard trainings that were disabled by the company
        const activeRealTrainings = trainings.filter(t => {
            if (t.type !== "CUSTOM") {
                const disabledDocs = (employee.company.disabledDocuments as string[]) || []
                return !disabledDocs.includes(t.type)
            }
            return requirements.some(req => req.name === t.name);
        });

        const mergedTrainings = [...activeRealTrainings]

        // 2. Add virtual placeholders
        requirements.forEach(req => {
            const exists = activeRealTrainings.find(t => t.type === "CUSTOM" && t.name === req.name)
            if (!exists) {
                mergedTrainings.push({
                    id: `virtual-${req.id}`,
                    type: "CUSTOM",
                    name: req.name,
                    status: "PENDING",
                    fileUrl: null,
                    issuedAt: null,
                    expiresAt: null,
                    employeeId: employeeId,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    deletedAt: null
                } as any)
            }
        })

        return NextResponse.json(mergedTrainings)
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
