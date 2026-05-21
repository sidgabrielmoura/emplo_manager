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

        const activeRealDocs = documents.filter(doc => {
            if (doc.type !== "CUSTOM") return true;
            return requirements.some(req => req.name === doc.name);
        });

        // Map real documents and attach their corresponding targets
        const mergedDocuments = activeRealDocs.map(doc => {
            if (doc.type === "CUSTOM") {
                const req = requirements.find(r => r.name === doc.name)
                return {
                    ...doc,
                    target: req ? req.target : "COMPANY_DOC"
                }
            }
            return {
                ...doc,
                target: "COMPANY_DOC" // standard docs defaults to company docs
            }
        })

        // Add virtual documents for any requirements that are not physically present
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
                    deletedAt: null,
                    target: req.target
                } as any)
            }
        })

        return NextResponse.json(mergedDocuments)
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Erro interno ao buscar documentos da empresa' }, { status: 500 })
    }
}
