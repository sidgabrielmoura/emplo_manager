import db from "@/lib/prisma"
import { EmailService } from "@/lib/emails/service"

// Standard date parsing function
export function parseExcelDate(val: any): Date | null {
    if (!val) return null
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val
    
    if (typeof val === "number") {
        // Excel serial date number
        const date = new Date((val - 25569) * 86400 * 1000)
        return isNaN(date.getTime()) ? null : date
    }
    
    if (typeof val === "string") {
        const clean = val.trim()
        if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
            const date = new Date(clean)
            return isNaN(date.getTime()) ? null : date
        }
        // Check for DD/MM/YYYY
        const parts = clean.split("/")
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10)
            const month = parseInt(parts[1], 10) - 1
            const year = parseInt(parts[2], 10)
            
            // Check range boundaries explicitly
            if (day < 1 || day > 31 || month < 0 || month > 11 || year < 1800 || year > 2100) {
                return null
            }
            
            // Using year, month, day constructor
            const date = new Date(year, month, day)
            if (isNaN(date.getTime())) return null
            
            // Check for Date rollover (e.g. 31/02/2021 becomes 03/03/2021)
            if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
                return null
            }
            return date
        }
    }
    const parsed = new Date(val)
    return isNaN(parsed.getTime()) ? null : parsed
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
export async function updateImportStats(importId: number) {
    try {
        const items = await db.importItem.findMany({
            where: { importacao_id: importId }
        })

        const totalEncontrados = items.length
        const totalProcessados = items.filter(i => i.status === "COMPLETED" || i.status === "FAILED").length
        const totalCriados = items.filter(i => i.status === "COMPLETED").length
        const totalFalhas = items.filter(i => i.status === "FAILED").length

        const status = totalProcessados === totalEncontrados
            ? (totalFalhas > 0 ? "COMPLETED_WITH_ERRORS" : "COMPLETED")
            : "PROCESSING"

        const finalizadoEm = totalProcessados === totalEncontrados ? new Date() : null

        let tempoExecucao: string | null = null
        if (finalizadoEm) {
            const imp = await db.import.findUnique({ where: { id: importId } })
            if (imp) {
                const diffMs = finalizadoEm.getTime() - imp.iniciado_em.getTime()
                const diffSecs = Math.floor(diffMs / 1000)
                if (diffSecs < 60) {
                    tempoExecucao = `${diffSecs}s`
                } else {
                    const mins = Math.floor(diffSecs / 60)
                    const secs = diffSecs % 60
                    tempoExecucao = `${mins}m${secs}s`
                }
            }
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

// Function to process the entire queue in the background
export async function processImportQueue(importId: number) {
    try {
        // Fetch all pending items
        const pendingItems = await db.importItem.findMany({
            where: {
                importacao_id: importId,
                status: "PENDING"
            },
            orderBy: {
                linha_planilha: "asc"
            }
        })

        // Update import status to PROCESSING if it is PENDING
        await db.import.update({
            where: { id: importId },
            data: { status: "PROCESSING" }
        })

        // Process sequentially to avoid lock issues and manage stats correctly
        for (const item of pendingItems) {
            await processImportItem(item.id)
        }

        // Final update to stats when finished
        await updateImportStats(importId)

        // Fetch completed import details and notify creator
        try {
            const finishedImport = await db.import.findUnique({
                where: { id: importId }
            })

            if (finishedImport) {
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
