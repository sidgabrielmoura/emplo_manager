import db from "@/lib/prisma"
import { getServerUserId, unauthorizedResponse, validateCompanyAccess, forbiddenResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { updateExpiredStatuses } from "@/lib/docs"

export async function POST(req: NextRequest) {
    try {
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
 
        
        
        // Keep all real trainings belonging to this employee.
        // We do not filter them out even if they aren't in the global required checklist,
        // because the admin can add specific trainings for this specific employee on the fly.
        const mergedTrainings = [...trainings]

        // Add virtual trainings for any required trainings that don't exist in the database yet
        requirements.forEach(req => {
            const exists = trainings.find(t => t.type === "CUSTOM" && t.name === req.name)
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
                    deletedAt: null,
                    isEnabled: true // Defaults to enabled
                } as any)
            }
        })


        return NextResponse.json(mergedTrainings)
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
