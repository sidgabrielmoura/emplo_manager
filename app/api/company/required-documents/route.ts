import db from "@/lib/prisma"
import { forbiddenResponse, getServerUserId, unauthorizedResponse, validateCompanyAccess } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

// GET: List required documents for a company
export async function GET(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const companyId = req.nextUrl.searchParams.get("companyId")
        if (!companyId) {
            return NextResponse.json({ error: "companyId é obrigatório" }, { status: 400 })
        }

        const hasAccess = await validateCompanyAccess(userId, companyId)
        if (!hasAccess) return forbiddenResponse()

        const docs = await db.companyRequiredDocument.findMany({
            where: { companyId },
            orderBy: { createdAt: "desc" }
        })

        return NextResponse.json(docs)
    } catch (error) {
        console.error("GET REQUIRED DOCUMENTS ERROR:", error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}

// POST: Create a new required document
export async function POST(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const body = await req.json()
        const { companyId, name, target, validityDays, isEnabled } = body

        if (!companyId || !name || !name.trim()) {
            return NextResponse.json({ error: "companyId e nome do documento são obrigatórios" }, { status: 400 })
        }

        const hasAccess = await validateCompanyAccess(userId, companyId)
        if (!hasAccess) return forbiddenResponse()

        const docName = name.trim()

        const existing = await db.companyRequiredDocument.findUnique({
            where: {
                companyId_name_target: {
                    companyId,
                    name: docName,
                    target: target || "EMPLOYEE_DOC"
                }
            }
        })

        if (existing) {
            return NextResponse.json({ error: "Este documento já está registrado" }, { status: 400 })
        }

        const newReq = await db.companyRequiredDocument.create({
            data: {
                companyId,
                name: docName,
                target: target || "EMPLOYEE_DOC",
                validityDays: validityDays ? parseInt(validityDays) : null,
                isEnabled: isEnabled !== undefined ? isEnabled : true
            }
        })

        return NextResponse.json(newReq)
    } catch (error) {
        console.error("CREATE REQUIRED DOCUMENT ERROR:", error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}

// PUT: Update a required document (edit name, validityDays, or isEnabled status)
export async function PUT(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const body = await req.json()
        const { id, name, target, validityDays, isEnabled } = body

        if (!id) {
            return NextResponse.json({ error: "id é obrigatório" }, { status: 400 })
        }

        const existing = await db.companyRequiredDocument.findUnique({
            where: { id }
        })

        if (!existing) {
            return NextResponse.json({ error: "Documento padrão não encontrado" }, { status: 404 })
        }

        const hasAccess = await validateCompanyAccess(userId, existing.companyId)
        if (!hasAccess) return forbiddenResponse()

        const updated = await db.companyRequiredDocument.update({
            where: { id },
            data: {
                name: name !== undefined ? name.trim() : existing.name,
                target: target || existing.target,
                validityDays: validityDays !== undefined ? (validityDays ? parseInt(validityDays) : null) : existing.validityDays,
                isEnabled: isEnabled !== undefined ? isEnabled : existing.isEnabled
            }
        })

        return NextResponse.json(updated)
    } catch (error) {
        console.error("UPDATE REQUIRED DOCUMENT ERROR:", error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}

// DELETE: Remove a required document
export async function DELETE(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const id = req.nextUrl.searchParams.get("id")
        if (!id) {
            return NextResponse.json({ error: "id é obrigatório" }, { status: 400 })
        }

        const existing = await db.companyRequiredDocument.findUnique({
            where: { id }
        })

        if (!existing) {
            return NextResponse.json({ error: "Documento padrão não encontrado" }, { status: 404 })
        }

        const hasAccess = await validateCompanyAccess(userId, existing.companyId)
        if (!hasAccess) return forbiddenResponse()

        await db.companyRequiredDocument.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("DELETE REQUIRED DOCUMENT ERROR:", error)
        return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }
}
