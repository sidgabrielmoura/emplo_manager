import db from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { updateExpiredStatuses } from "@/lib/docs"

async function handlePassportView(employeeId: string) {
    if (!employeeId || typeof employeeId !== "string") {
        return NextResponse.json(
            { error: "ID do funcionário é obrigatório" },
            { status: 400 }
        )
    }

    try {
        const employee = await db.employee.findUnique({
            where: { id: employeeId },
            select: {
                id: true,
                name: true,
                cpf: true,
                position: true,
                image: true,
                status: true,
                companyId: true,
                contact: {
                    select: {
                        emergencyContact: true,
                        phone: true
                    }
                },
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
            return NextResponse.json(
                { error: "Perfil de qualificação não encontrado" },
                { status: 404 }
            )
        }

        // Update expired document and training statuses for the company
        await updateExpiredStatuses(employee.companyId)

        const [trainings, deletedTrainings, requirements, latestEmission] = await Promise.all([
            db.training.findMany({
                where: {
                    employeeId: employee.id,
                    deletedAt: null
                },
                orderBy: [
                    { position: "asc" },
                    { createdAt: "asc" }
                ]
            }),
            db.training.findMany({
                where: {
                    employeeId: employee.id,
                    deletedAt: { not: null }
                },
                select: { name: true, type: true }
            }),
            db.companyRequiredDocument.findMany({
                where: {
                    companyId: employee.companyId,
                    target: "EMPLOYEE_TRAINING",
                    isEnabled: true
                },
                orderBy: [
                    { position: "asc" },
                    { createdAt: "asc" }
                ]
            }),
            db.passportEmission.findFirst({
                where: { employeeId: employee.id },
                orderBy: { issuedAt: "desc" }
            })
        ])

        // Normalize company required trainings positions if any is 0 or duplicates exist
        const reqPositions = requirements.map(r => r.position)
        const hasReqZeroOrDuplicates = reqPositions.some(p => p === 0) || new Set(reqPositions).size !== reqPositions.length
        if (hasReqZeroOrDuplicates && requirements.length > 0) {
            requirements.forEach((req, idx) => {
                req.position = idx + 1
            })
        }

        // Map training position to matching requirement position if training.position is 0
        trainings.forEach(t => {
            if (!t.position || t.position <= 0) {
                const req = requirements.find(r => r.name === t.name)
                if (req && req.position > 0) {
                    t.position = req.position
                }
            }
        })

        const mergedTrainings: any[] = [...trainings]

        requirements.forEach(req => {
            const exists = trainings.find(t => t.type === "CUSTOM" && t.name === req.name)
            const wasDeleted = deletedTrainings.some(t => t.type === "CUSTOM" && t.name === req.name)
            if (!exists && !wasDeleted) {
                mergedTrainings.push({
                    id: `virtual-${req.id}`,
                    type: "CUSTOM",
                    name: req.name,
                    status: "PENDING",
                    fileUrl: null,
                    issuedAt: null,
                    expiresAt: null,
                    employeeId: employee.id,
                    createdAt: req.createdAt,
                    updatedAt: req.updatedAt,
                    deletedAt: null,
                    isEnabled: true,
                    position: req.position
                })
            }
        })

        // Sort deterministically: primary by position, secondary by name
        mergedTrainings.sort((a, b) => {
            const posA = a.position ?? 0
            const posB = b.position ?? 0
            if (posA !== posB) return posA - posB
            const nameComp = (a.name || "").localeCompare(b.name || "", "pt-BR")
            if (nameComp !== 0) return nameComp
            return (a.id || "").localeCompare(b.id || "")
        })

        // Data minimization: only expose non-sensitive fields required by the qualification passport
        const sanitizedTrainings = mergedTrainings
            .filter(t => t.isEnabled !== false)
            .map((t, idx) => ({
                id: t.id,
                name: t.name,
                type: t.type,
                status: t.status,
                expiresAt: t.expiresAt,
                isEnabled: t.isEnabled,
                position: t.position ?? idx + 1
            }))

        return NextResponse.json({
            employee: {
                id: employee.id,
                name: employee.name,
                cpf: employee.cpf,
                position: employee.position,
                image: employee.image,
                contact: {
                    emergencyContact: employee.contact?.emergencyContact || null
                }
            },
            company: {
                id: employee.company.id,
                name: employee.company.name,
                imageUrl: employee.company.imageUrl
            },
            trainings: sanitizedTrainings,
            emission: latestEmission ? {
                id: latestEmission.id,
                issuedAt: latestEmission.issuedAt
            } : null
        })
    } catch (error) {
        console.error("GET PUBLIC PASSPORT VIEW ERROR:", error)
        return NextResponse.json({ error: "Erro interno ao buscar perfil" }, { status: 500 })
    }
}

export async function GET(
    _req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const { id } = await props.params
    return handlePassportView(id)
}

export async function POST(
    _req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const { id } = await props.params
    return handlePassportView(id)
}
