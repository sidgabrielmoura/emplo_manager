import db from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { isSuperAdmin, forbiddenResponse } from "@/lib/auth"
import { deleteR2Files } from "@/lib/r2"

export async function GET(req: NextRequest) {
    try {
        const isSuper = await isSuperAdmin(req)
        if (!isSuper) return forbiddenResponse()

        const companies = await db.company.findMany({
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                name: true,
                imageUrl: true,
                cnpj: true,
                email: true,
                phone: true,
                address: true,
                state: true,
                city: true,
                responsible: true,
                status: true,
                createdAt: true,
                _count: {
                    select: { employees: true }
                }
            }
        })

        return NextResponse.json(companies, { status: 200 })
    } catch (error) {
        console.error("[SUPERADMIN_GET_COMPANIES]", error)
        return NextResponse.json({ error: "Erro ao carregar empresas" }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const isSuper = await isSuperAdmin(req)
        if (!isSuper) return forbiddenResponse()

        let companyId = req.nextUrl.searchParams.get("companyId") || req.nextUrl.searchParams.get("id")

        if (!companyId) {
            const body = await req.json().catch(() => ({}))
            companyId = body.companyId || body.id
        }

        if (!companyId) {
            return NextResponse.json({ error: "companyId é obrigatório" }, { status: 400 })
        }

        const company = await db.company.findUnique({
            where: { id: companyId },
            include: {
                documents: { select: { fileUrl: true } },
                employees: {
                    select: {
                        id: true,
                        image: true,
                        documents: { select: { fileUrl: true } },
                        trainings: { select: { fileUrl: true } }
                    }
                }
            }
        })

        if (!company) {
            return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 })
        }

        // 1. Coleta todas as URLs de arquivos no Cloudflare R2
        const fileUrls: (string | null | undefined)[] = []

        if (company.imageUrl) fileUrls.push(company.imageUrl)

        company.documents.forEach(doc => {
            if (doc.fileUrl) fileUrls.push(doc.fileUrl)
        })

        company.employees.forEach(emp => {
            if (emp.image) fileUrls.push(emp.image)
            emp.documents.forEach(doc => {
                if (doc.fileUrl) fileUrls.push(doc.fileUrl)
            })
            emp.trainings.forEach(tr => {
                if (tr.fileUrl) fileUrls.push(tr.fileUrl)
            })
        })

        // 2. Expurgo no Cloudflare R2
        const r2Result = await deleteR2Files(fileUrls)

        // 3. Exclusão em cascata completa no Banco de Dados
        await db.$transaction(async (tx) => {
            // Logs de email
            await tx.emailLog.deleteMany({
                where: { companyId }
            })

            // Infiltração / Espião
            const spyAccesses = await tx.spyAccess.findMany({
                where: { companyId },
                select: { id: true }
            })
            const spyIds = spyAccesses.map(s => s.id)
            if (spyIds.length > 0) {
                await tx.spyLog.deleteMany({ where: { spyAccessId: { in: spyIds } } })
                await tx.spySession.deleteMany({ where: { spyAccessId: { in: spyIds } } })
                await tx.spyAccess.deleteMany({ where: { id: { in: spyIds } } })
            }

            // Notificações
            await tx.notificationRecipient.deleteMany({
                where: { companyId }
            })

            // Importações
            const imports = await tx.import.findMany({
                where: { companyId },
                select: { id: true }
            })
            const importIds = imports.map(i => i.id)
            if (importIds.length > 0) {
                await tx.importItem.deleteMany({ where: { importacao_id: { in: importIds } } })
                await tx.import.deleteMany({ where: { id: { in: importIds } } })
            }

            // Funcionários e dependências
            const employeeIds = company.employees.map(e => e.id)
            if (employeeIds.length > 0) {
                await tx.passportEmission.deleteMany({ where: { employeeId: { in: employeeIds } } })
                await tx.contract.deleteMany({ where: { employeeId: { in: employeeIds } } })
                await tx.employeeContact.deleteMany({ where: { employeeId: { in: employeeIds } } })
                await tx.employeeAddress.deleteMany({ where: { employeeId: { in: employeeIds } } })
                await tx.document.deleteMany({ where: { employeeId: { in: employeeIds } } })
                await tx.training.deleteMany({ where: { employeeId: { in: employeeIds } } })
                await tx.importItem.deleteMany({ where: { funcionario_id: { in: employeeIds } } })
                await tx.employee.deleteMany({ where: { id: { in: employeeIds } } })
            }

            // Centros de custo
            await tx.costCenter.deleteMany({
                where: { companyId }
            })

            // Documentos da empresa
            await tx.companyDocument.deleteMany({
                where: { companyId }
            })
            await tx.companyRequiredDocument.deleteMany({
                where: { companyId }
            })

            // Usuários e preferências
            const users = await tx.user.findMany({
                where: { companyId },
                select: { id: true }
            })
            const userIds = users.map(u => u.id)
            if (userIds.length > 0) {
                await tx.notificationPreferences.deleteMany({ where: { userId: { in: userIds } } })
                await tx.user.deleteMany({ where: { id: { in: userIds } } })
            }

            // Registro principal da empresa
            await tx.company.delete({
                where: { id: companyId }
            })
        })

        return NextResponse.json({
            success: true,
            message: `Empresa "${company.name}" e todos os dados e arquivos foram excluídos com sucesso.`,
            filesPurged: r2Result.deleted,
            r2Errors: r2Result.errors.length > 0 ? r2Result.errors : undefined
        }, { status: 200 })
    } catch (error) {
        console.error("[SUPERADMIN_DELETE_COMPANY]", error)
        return NextResponse.json({ error: "Erro ao excluir empresa" }, { status: 500 })
    }
}

