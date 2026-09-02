import * as XLSX from "xlsx"
import db from "@/lib/prisma"
import { EmailService } from "@/lib/emails/service"

// Standard date parsing function
export function parseExcelDate(val: any): Date | null {
    if (!val) return null
    if (val instanceof Date) {
        if (isNaN(val.getTime())) return null
        const y = val.getFullYear()
        if (y < 1900 || y > 2100) return null
        return new Date(val.getFullYear(), val.getMonth(), val.getDate(), 12, 0, 0)
    }

    const clean = String(val).trim()
    if (!clean) return null

    // 1. If it's an Excel serial date number (number or numeric string, e.g. 33559 or "33559")
    if (typeof val === "number" || /^\d+(\.\d+)?$/.test(clean)) {
        const num = typeof val === "number" ? val : parseFloat(clean)
        if (!isNaN(num) && num >= 1 && num <= 100000) {
            try {
                const parsedObj = XLSX.SSF.parse_date_code(num)
                if (parsedObj && parsedObj.y >= 1900 && parsedObj.y <= 2100) {
                    const date = new Date(parsedObj.y, parsedObj.m - 1, parsedObj.d, 12, 0, 0)
                    return isNaN(date.getTime()) ? null : date
                }
            } catch (e) {
                // Ignore and try fallback
            }
        }
    }

    // 2. YYYY-MM-DD or YYYY/MM/DD
    if (/^\d{4}[-/]\d{2}[-/]\d{2}/.test(clean)) {
        const parts = clean.substring(0, 10).split(/[-/]/)
        const year = parseInt(parts[0], 10)
        const month = parseInt(parts[1], 10) - 1
        const day = parseInt(parts[2], 10)
        if (year < 1900 || year > 2100 || month < 0 || month > 11 || day < 1 || day > 31) {
            return null
        }
        const date = new Date(year, month, day, 12, 0, 0)
        if (isNaN(date.getTime()) || date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
            return null
        }
        return date
    }

    // 3. DD/MM/YYYY or DD-MM-YYYY (and DD/MM/YY)
    if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(clean)) {
        const parts = clean.split(/[-/]/)
        if (parts.length >= 3) {
            const day = parseInt(parts[0], 10)
            const month = parseInt(parts[1], 10) - 1
            let year = parseInt(parts[2], 10)

            if (year < 100) {
                year += year > 50 ? 1900 : 2000
            }

            if (day < 1 || day > 31 || month < 0 || month > 11 || year < 1900 || year > 2100) {
                return null
            }

            const date = new Date(year, month, day, 12, 0, 0)
            if (isNaN(date.getTime()) || date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
                return null
            }
            return date
        }
    }

    // 4. Fallback: try parsing with standard Date constructor, but enforce year sanity!
    const parsed = new Date(val)
    if (isNaN(parsed.getTime())) return null
    const y = parsed.getFullYear()
    if (y < 1900 || y > 2100) {
        return null
    }
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0)
}

export function isValidCPF(cpf: string): boolean {
    const clean = cpf.replace(/\D/g, "")
    if (clean.length !== 11) return false
    if (/^(\d)\1{10}$/.test(clean)) return false
    
    let sum = 0
    for (let i = 0; i < 9; i++) {
        sum += parseInt(clean.charAt(i)) * (10 - i)
    }
    let rev = 11 - (sum % 11)
    if (rev === 10 || rev === 11) rev = 0
    if (rev !== parseInt(clean.charAt(9))) return false

    sum = 0
    for (let i = 0; i < 10; i++) {
        sum += parseInt(clean.charAt(i)) * (11 - i)
    }
    rev = 11 - (sum % 11)
    if (rev === 10 || rev === 11) rev = 0
    if (rev !== parseInt(clean.charAt(10))) return false

    return true
}

export function validateCPF(cpf: string): string | null {
    if (!cpf) return "CPF é obrigatório"
    const clean = cpf.replace(/\D/g, "")
    if (clean.length < 11 || clean.length > 14) {
        return "CPF/Documento deve ter entre 11 e 14 dígitos"
    }
    if (clean.length === 11) {
        if (!isValidCPF(clean)) {
            return "CPF inválido"
        }
    }
    return null
}

export function validateEmail(email: string): string | null {
    if (!email) return "Email é obrigatório"
    const trimmed = email.trim()
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!regex.test(trimmed)) {
        return "Email com formato inválido"
    }
    return null
}

export function escapeHtml(str: string | null | undefined): string | null {
    if (!str) return null
    return str.replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

// Function to process a single item in the import queue
export async function processImportItem(itemId: string): Promise<{ success: boolean; errorMsg?: string }> {
    let item: any = null
    try {
        // Fetch item
        item = await db.importItem.findUnique({
            where: { id: itemId },
            include: { importacao: true }
        })

        if (!item) {
            return { success: false, errorMsg: "Item de importação não encontrado" }
        }

        // Set state to PROCESSING
        await db.importItem.update({
            where: { id: itemId },
            data: { status: "PROCESSING" }
        })

        const companyId = item.importacao.companyId
        const errors: string[] = []

        // 1. Validations
        if (!item.nome || !item.nome.trim()) {
            errors.push("Nome é obrigatório")
        }

        const emailErr = validateEmail(item.email || "")
        if (emailErr) {
            errors.push(emailErr)
        } else {
            // Check email uniqueness in Employee (case-insensitive)
            const cleanEmail = item.email!.trim().toLowerCase()
            const existingEmail = await db.employee.findFirst({
                where: { email: { equals: cleanEmail, mode: "insensitive" } }
            })
            if (existingEmail) {
                errors.push("Email já cadastrado no sistema")
            }
        }

        const cpfErr = validateCPF(item.cpf || "")
        if (cpfErr) {
            errors.push(cpfErr)
        } else {
            // Check CPF uniqueness in Employee (checks both formatted and unformatted CPF)
            const rawCpf = item.cpf!.trim().replace(/\D/g, "")
            const formattedCpf = rawCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
            const existingCPF = await db.employee.findFirst({
                where: {
                    OR: [
                        { cpf: rawCpf },
                        { cpf: formattedCpf }
                    ]
                }
            })
            if (existingCPF) {
                errors.push("CPF já cadastrado no sistema")
            }
        }

        if (!item.cargo || !item.cargo.trim()) {
            errors.push("Cargo é obrigatório")
        }

        if (!item.genero) {
            errors.push("Gênero é obrigatório")
        } else {
            const genClean = item.genero.trim().toUpperCase()
            if (
                genClean !== "MALE" && 
                genClean !== "FEMALE" && 
                genClean !== "HOMEM" && 
                genClean !== "MULHER" &&
                genClean !== "MASCULINO" &&
                genClean !== "FEMININO"
            ) {
                errors.push("Gênero inválido (deve ser Masculino ou Feminino)")
            }
        }

        let parsedBirthDate: Date | null = null
        if (!item.nascimento) {
            errors.push("Data de nascimento é obrigatória")
        } else {
            parsedBirthDate = parseExcelDate(item.nascimento)
            if (!parsedBirthDate) {
                errors.push("Data de nascimento inválida")
            }
        }

        if (!item.contato || !item.contato.trim()) {
            errors.push("Contato é obrigatório")
        }

        let parsedAdmissionDate: Date | null = null
        if (!item.data_admissao) {
            errors.push("Data de admissão é obrigatória")
        } else {
            parsedAdmissionDate = parseExcelDate(item.data_admissao)
            if (!parsedAdmissionDate) {
                errors.push("Data de admissão inválida")
            }
        }

        // Cost Center is configured post-import by the admin
        let costCenterId: string | null = null;

        // If there are validation errors, mark as FAILED
        if (errors.length > 0) {
            const errorText = errors.join("; ")
            await db.importItem.update({
                where: { id: itemId },
                data: {
                    status: "FAILED",
                    erro: errorText
                }
            })

            // Update stats
            await updateImportStats(item.importacao_id)
            return { success: false, errorMsg: errorText }
        }

        // Map Gender Enum
        let genderEnum: "MALE" | "FEMALE" = "MALE"
        const genClean = item.genero!.trim().toUpperCase()
        if (genClean === "FEMALE" || genClean === "MULHER" || genClean === "FEMININO") {
            genderEnum = "FEMALE"
        }

        // Extract registration (Matrícula) and RG if available in original data
        let registration: string | null = null
        let rg: string | null = null
        if (item.dados_originais) {
            try {
                const orig = typeof item.dados_originais === "string" ? JSON.parse(item.dados_originais) : item.dados_originais
                for (const key of Object.keys(orig)) {
                    const norm = key.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
                    if ((norm === "matricula" || norm === "registration") && orig[key] != null) {
                        registration = String(orig[key]).trim()
                    }
                    if ((norm === "rg" || norm === "documento" || norm === "identidade") && orig[key] != null) {
                        rg = String(orig[key]).trim()
                    }
                }
            } catch (e) {}
        }

        // 2. Perform Creation in Transaction
        const newEmployee = await db.$transaction(async (tx) => {
            // Create employee record
            const employee = await tx.employee.create({
                data: {
                    name: escapeHtml(item.nome!.trim())!,
                    email: item.email!.trim().toLowerCase(),
                    cpf: item.cpf!.trim().replace(/\D/g, ""),
                    gender: genderEnum,
                    image: "/avatar-placeholder.jpeg", // Default avatar placeholder for import
                    position: escapeHtml(item.cargo!.trim())!,
                    birthDate: parsedBirthDate!,
                    registration: registration || null,
                    rg: rg || null,
                    companyId,
                    costCenterId,
                    
                    contact: {
                        create: {
                            phone: escapeHtml(item.contato!.trim())!,
                            emergencyContact: null
                        }
                    },
                    
                    address: {
                        create: {
                            cep: item.cep ? item.cep.trim() : null,
                            address: escapeHtml(item.address),
                            number: escapeHtml(item.number),
                            city: escapeHtml(item.city),
                            district: escapeHtml(item.district),
                            complement: escapeHtml(item.complement)
                        }
                    },

                    contract: {
                        create: {
                            startDate: parsedAdmissionDate!,
                            status: "ACTIVE"
                        }
                    }
                }
            })

            // Fetch and create default documents
            const defaultDocs = await tx.companyRequiredDocument.findMany({
                where: {
                    companyId,
                    target: "EMPLOYEE_DOC",
                    isEnabled: true
                }
            })

            if (defaultDocs.length > 0) {
                await tx.document.createMany({
                    data: defaultDocs.map((req) => ({
                        employeeId: employee.id,
                        type: "CUSTOM",
                        name: req.name,
                        isEnabled: true,
                        position: req.position
                    })),
                    skipDuplicates: true
                })
            }

            // Fetch and create default trainings
            const defaultTrainings = await tx.companyRequiredDocument.findMany({
                where: {
                    companyId,
                    target: "EMPLOYEE_TRAINING",
                    isEnabled: true
                }
            })

            if (defaultTrainings.length > 0) {
                await tx.training.createMany({
                    data: defaultTrainings.map((req) => ({
                        employeeId: employee.id,
                        type: "CUSTOM",
                        name: req.name,
                        isEnabled: true,
                        position: req.position
                    })),
                    skipDuplicates: true
                })
            }

            return employee
        })

        // 3. Mark Item as COMPLETED
        await db.importItem.update({
            where: { id: itemId },
            data: {
                status: "COMPLETED",
                funcionario_id: newEmployee.id,
                erro: null
            }
        })

        // Update stats
        await updateImportStats(item.importacao_id)
        return { success: true }

    } catch (err: any) {
        console.error("Error processing import item:", err)
        let errorMsg = "Erro desconhecido ao processar item"
        if (err.code === "P2002") {
            errorMsg = "Duplicidade de CPF ou Email no banco de dados"
        } else if (err.message) {
            errorMsg = err.message
        }

        await db.importItem.update({
            where: { id: itemId },
            data: {
                status: "FAILED",
                erro: errorMsg
            }
        }).catch(console.error)

        // Update stats
        if (item) {
            await updateImportStats(item.importacao_id)
        }
        return { success: false, errorMsg }
    }
}

// Function to calculate and update statistics for an import
export async function updateImportStats(importId: number, forcedStatus?: "PAUSED" | "CANCELLED") {
    try {
        const items = await db.importItem.findMany({
            where: { importacao_id: importId }
        })

        const totalEncontrados = items.length
        const totalProcessados = items.filter(i => i.status === "COMPLETED" || i.status === "FAILED").length
        const totalCriados = items.filter(i => i.status === "COMPLETED").length
        const totalFalhas = items.filter(i => i.status === "FAILED").length

        const currentImp = await db.import.findUnique({ where: { id: importId } })
        if (!currentImp) return

        let status = currentImp.status
        if (forcedStatus) {
            status = forcedStatus
        } else if (totalProcessados === totalEncontrados && totalEncontrados > 0) {
            status = totalFalhas > 0 ? "COMPLETED_WITH_ERRORS" : "COMPLETED"
        } else if (status !== "PAUSED" && status !== "CANCELLED" && status !== "FAILED") {
            status = "PROCESSING"
        }

        const isFinished = status === "COMPLETED" || status === "COMPLETED_WITH_ERRORS" || status === "FAILED"
        const finalizadoEm = isFinished ? new Date() : currentImp.finalizado_em

        let tempoExecucao = currentImp.tempo_execucao
        const now = new Date()
        const diffMs = (finalizadoEm ? finalizadoEm.getTime() : now.getTime()) - currentImp.iniciado_em.getTime()
        const diffSecs = Math.max(0, Math.floor(diffMs / 1000))
        if (diffSecs < 60) {
            tempoExecucao = `${diffSecs}s`
        } else {
            const mins = Math.floor(diffSecs / 60)
            const secs = diffSecs % 60
            tempoExecucao = `${mins}m${secs}s`
        }

        await db.import.update({
            where: { id: importId },
            data: {
                total_encontrados: totalEncontrados,
                total_processados: totalProcessados,
                total_criados: totalCriados,
                total_falhas: totalFalhas,
                status: status as any,
                finalizado_em: finalizadoEm,
                tempo_execucao: tempoExecucao
            }
        })
    } catch (e) {
        console.error("Error updating import stats:", e)
    }
}

const MAX_PROCESSING_TIME_MS = 5 * 60 * 1000; // 5 minutes strict processing window

// Function to process the entire queue in the background
export async function processImportQueue(importId: number) {
    const queueStartTime = Date.now();
    try {
        const currentImp = await db.import.findUnique({
            where: { id: importId }
        })

        if (!currentImp || currentImp.status === "PAUSED" || currentImp.status === "CANCELLED") {
            return
        }

        // Fetch all pending items ordered by row
        const pendingItems = await db.importItem.findMany({
            where: {
                importacao_id: importId,
                status: "PENDING"
            },
            orderBy: {
                linha_planilha: "asc"
            }
        })

        if (pendingItems.length === 0) {
            await updateImportStats(importId)
            return
        }

        // Update import status to PROCESSING
        await db.import.update({
            where: { id: importId },
            data: { status: "PROCESSING" }
        })

        // Process sequentially to avoid lock issues and manage stats accurately
        for (const item of pendingItems) {
            // 1. Check if user paused or cancelled the import
            const checkStatus = await db.import.findUnique({
                where: { id: importId },
                select: { status: true }
            })

            if (checkStatus?.status === "PAUSED") {
                console.log(`[Import #${importId}] Paused by user before item ${item.id}`)
                await updateImportStats(importId, "PAUSED")
                return
            }

            if (checkStatus?.status === "CANCELLED") {
                console.log(`[Import #${importId}] Cancelled by user before item ${item.id}`)
                await updateImportStats(importId, "CANCELLED")
                return
            }

            // 2. Check 5-minute timeout window
            const elapsedMs = Date.now() - queueStartTime
            if (elapsedMs >= MAX_PROCESSING_TIME_MS) {
                console.warn(`[Import #${importId}] Reached 5-minute processing limit. Safely pausing remaining queue.`)
                await db.import.update({
                    where: { id: importId },
                    data: { status: "PAUSED" }
                })
                await updateImportStats(importId, "PAUSED")
                return
            }

            // 3. Process the item with safe fallback
            try {
                await processImportItem(item.id)
            } catch (itemErr: any) {
                console.error(`Error processing item ${item.id}:`, itemErr)
                await db.importItem.update({
                    where: { id: item.id },
                    data: {
                        status: "FAILED",
                        erro: itemErr?.message || "Erro inesperado ao processar linha"
                    }
                }).catch(console.error)
                await updateImportStats(importId)
            }
        }

        // Final update to stats when run completes
        await updateImportStats(importId)

        // Fetch completed import details and notify creator
        try {
            const finishedImport = await db.import.findUnique({
                where: { id: importId }
            })

            if (finishedImport && (finishedImport.status === "COMPLETED" || finishedImport.status === "COMPLETED_WITH_ERRORS")) {
                let creatorEmail: string | null = null
                let creatorName: string = "Administrador"

                const userCreator = await db.user.findUnique({
                    where: { id: finishedImport.criado_por },
                    include: { notificationPreferences: true }
                })

                if (userCreator) {
                    creatorEmail = userCreator.notificationPreferences?.email || userCreator.email
                    creatorName = userCreator.name
                } else {
                    const superCreator = await db.superadmin.findUnique({
                        where: { id: finishedImport.criado_por },
                        include: { notificationPreferences: true }
                    })
                    if (superCreator) {
                        creatorEmail = superCreator.notificationPreferences?.email || superCreator.email
                        creatorName = superCreator.name
                    }
                }

                if (creatorEmail) {
                    await EmailService.sendImportCompletionNotification({
                        to: creatorEmail,
                        adminName: creatorName,
                        fileName: finishedImport.arquivo,
                        totalFound: finishedImport.total_encontrados,
                        totalCreated: finishedImport.total_criados,
                        totalFailed: finishedImport.total_falhas,
                        companyId: finishedImport.companyId
                    })
                }
            }
        } catch (mailErr) {
            console.error("Error sending import completion email:", mailErr)
        }

    } catch (error) {
        console.error(`Fatal error in processImportQueue for import #${importId}:`, error)
        await db.import.update({
            where: { id: importId },
            data: { status: "FAILED" }
        }).catch(console.error)
    }
}

export async function pauseImportQueue(importId: number) {
    await db.import.update({
        where: { id: importId },
        data: { status: "PAUSED" }
    })
    await updateImportStats(importId, "PAUSED")
}

export async function resumeImportQueue(importId: number) {
    await db.import.update({
        where: { id: importId },
        data: { status: "PROCESSING" }
    })
    processImportQueue(importId).catch(err => {
        console.error(`Error resuming import queue #${importId}:`, err)
    })
}

