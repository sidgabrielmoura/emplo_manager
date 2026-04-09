import db from "@/lib/prisma"
import { getServerUserId, unauthorizedResponse, validateCompanyAccess, forbiddenResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const body = await req.json()
        const companyId = body.company_id

        if (!companyId) {
            return NextResponse.json({ error: 'ID da empresa não informado' }, { status: 400 })
        }

        const company = await db.company.findUnique({
            where: { id: companyId },
            select: { disabledDocuments: true }
        })

        if (!company) {
            return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 })
        }

        const hasAccess = await validateCompanyAccess(userId, companyId)
        if (!hasAccess) return forbiddenResponse()

        const [documents, requirements] = await Promise.all([
            db.companyDocument.findMany({
                where: { companyId: companyId, deletedAt: null },
                orderBy: { updatedAt: "desc" }
            }),
            db.companyRequiredDocument.findMany({
                where: {
                    companyId: companyId,
                    target: { in: ["COMPANY_DOC", "COMPANY_LABOR"] },
                    isEnabled: true
                }
            })
        ])

        // 1. Start with real documents found in DB
        // But filter them: if CUSTOM, only keep if matching an enabled requirement
        const activeRealDocs = documents.filter(doc => {
            if (doc.type !== "CUSTOM") return true;
            return requirements.some(req => req.name === doc.name);
        });

        const mergedDocuments = [...activeRealDocs]

        // 2. Add virtual placeholders for missing requirements
        requirements.forEach(req => {
            const exists = activeRealDocs.find(d => d.type === "CUSTOM" && d.name === req.name)
            if (!exists) {
                mergedDocuments.push({
                    id: `virtual-${req.id}`,
                    type: "CUSTOM",
                    name: req.name,
                    status: "PENDING",
                    fileUrl: null,
                    issuedAt: null,
                    expiresAt: null,
                    companyId: companyId,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    deletedAt: null
                } as any)
            }
        })

        return NextResponse.json(mergedDocuments)
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Erro interno ao buscar documentos da empresa' }, { status: 500 })
    }
}
