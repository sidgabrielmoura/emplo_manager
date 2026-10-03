import db from "@/lib/prisma"
import { getServerUserId, unauthorizedResponse, validateCompanyAccess, forbiddenResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { validateSpyAction } from "@/lib/spy-guard"
import { deleteR2Files } from "@/lib/r2"

function isR2StorageUrlOrKey(urlOrKey: string | null | undefined): boolean {
    if (!urlOrKey) return false
    const trimmed = urlOrKey.trim()
    if (!trimmed) return false
    if (trimmed.includes("avatar-placeholder") || trimmed.startsWith("/avatar")) {
        return false
    }
    // Ignore static local files starting with /
    if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
        return false
    }
    return true
}

async function handleDelete(req: NextRequest) {
    try {
        // 1. Autenticação do usuário
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        // 2. Extração e validação do payload
        let body: any = {}
        try {
            body = await req.json()
        } catch {
            // Requisições DELETE podem não ter body
        }

        const searchParams = req.nextUrl.searchParams
        const singleId = body.employeeId || body.id || searchParams.get("id") || searchParams.get("employeeId")
        const rawIds: string[] = Array.isArray(body.ids || body.employeeIds)
            ? (body.ids || body.employeeIds)
            : singleId ? [singleId] : []

        const targetIds = Array.from(
            new Set(
                rawIds
                    .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
                    .map(id => id.trim())
            )
        )

        if (targetIds.length === 0) {
            return NextResponse.json(
                { error: "ID do funcionário é obrigatório" },
                { status: 400 }
            )
        }

        // Limite de segurança para processamento em lote
        if (targetIds.length > 100) {
            return NextResponse.json(
                { error: "Limite máximo de 100 funcionários por operação de exclusão" },
                { status: 400 }
            )
        }

        // 3. Busca dos funcionários com todos os anexos e vínculos
        const employees = await db.employee.findMany({
            where: { id: { in: targetIds } },
            include: {
                documents: {
                    select: {
                        id: true,
                        fileUrl: true
                    }
                },
                trainings: {
                    select: {
                        id: true,
                        fileUrl: true
                    }
                }
            }
        })

        if (employees.length === 0) {
            return NextResponse.json(
                { error: "Funcionário(s) não encontrado(s)" },
                { status: 404 }
            )
        }

        // 4. Autorização Multi-tenancy e Spy Guard
        for (const emp of employees) {
            const hasAccess = await validateCompanyAccess(userId, emp.companyId)
            if (!hasAccess) return forbiddenResponse()

            const spyValidation = await validateSpyAction(req, "employees", "edit", {
                employeeId: emp.id,
                costCenterId: emp.costCenterId || undefined
            })
            if (!spyValidation.authorized) {
                return NextResponse.json(
                    { error: spyValidation.reason || "Não autorizado a excluir este funcionário" },
                    { status: 403 }
                )
            }

            if (spyValidation.isSpy) {
                const spyCcIds = spyValidation.costCenters || []
                if (spyCcIds.length > 0 && emp.costCenterId && !spyCcIds.includes(emp.costCenterId)) {
                    return NextResponse.json(
                        { error: "Você não tem permissão para excluir funcionários neste Centro de Custo" },
                        { status: 403 }
                    )
                }
            }
        }

        // 5. Coleta de todas as URLs de arquivos no Cloudflare R2
        const fileUrls: string[] = []
        for (const emp of employees) {
            if (isR2StorageUrlOrKey(emp.image)) {
                fileUrls.push(emp.image)
            }
            for (const doc of emp.documents) {
                if (isR2StorageUrlOrKey(doc.fileUrl)) {
                    fileUrls.push(doc.fileUrl!)
                }
            }
            for (const tr of emp.trainings) {
                if (isR2StorageUrlOrKey(tr.fileUrl)) {
                    fileUrls.push(tr.fileUrl!)
                }
            }
        }

        const validIds = employees.map(e => e.id)

        // 6. Exclusão atômica no Banco de Dados via Transação
        await db.$transaction(async (tx) => {
            // Emissões de passaporte
            await tx.passportEmission.deleteMany({
                where: { employeeId: { in: validIds } }
            })

            // Contratos
            await tx.contract.deleteMany({
                where: { employeeId: { in: validIds } }
            })

            // Contatos
            await tx.employeeContact.deleteMany({
                where: { employeeId: { in: validIds } }
            })

            // Endereços
            await tx.employeeAddress.deleteMany({
                where: { employeeId: { in: validIds } }
            })

            // Documentos
            await tx.document.deleteMany({
                where: { employeeId: { in: validIds } }
            })

            // Treinamentos
            await tx.training.deleteMany({
                where: { employeeId: { in: validIds } }
            })

            // Desvincular itens de importação
            await tx.importItem.updateMany({
                where: { funcionario_id: { in: validIds } },
                data: { funcionario_id: null }
            })

            // Exclusão dos funcionários
            await tx.employee.deleteMany({
                where: { id: { in: validIds } }
            })
        })

        // 7. Expurgo dos arquivos do Cloudflare R2 (fora da transação de banco)
        let r2Result = { deleted: 0, errors: [] as any[] }
        if (fileUrls.length > 0) {
            r2Result = await deleteR2Files(fileUrls)
            if (r2Result.errors && r2Result.errors.length > 0) {
                console.error("Avisos no expurgo R2 durante exclusão de funcionário:", r2Result.errors)
            }
        }

        // 8. Log de auditoria
        console.info(
            `[EMPLOYEE_DELETED] User ${userId} excluiu ${validIds.length} funcionário(s). Arquivos expurgados no R2: ${r2Result.deleted}.`
        )

        return NextResponse.json({
            success: true,
            message: validIds.length === 1
                ? "Funcionário excluído com sucesso."
                : `${validIds.length} funcionários excluídos com sucesso.`,
            deletedCount: validIds.length,
            purgedFilesCount: r2Result.deleted
        })
    } catch (error: any) {
        console.error("DELETE EMPLOYEE ERROR:", error)
        return NextResponse.json(
            { error: error?.message || "Erro ao excluir funcionário" },
            { status: 500 }
        )
    }
}

export async function DELETE(req: NextRequest) {
    return handleDelete(req)
}

export async function POST(req: NextRequest) {
    return handleDelete(req)
}
