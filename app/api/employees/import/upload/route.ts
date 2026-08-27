import * as XLSX from "xlsx"
import db from "@/lib/prisma"
import { getServerUserId, unauthorizedResponse, validateCompanyAccess, forbiddenResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { processImportQueue } from "@/lib/import-queue"
import { validateSpyAction } from "@/lib/spy-guard"

function formatExcelDateString(val: any): string | null {
    if (val === null || val === undefined || val === "") return null
    if (val instanceof Date) {
        if (isNaN(val.getTime())) return null
        // If hours is 0 (standard midnight), use UTC to avoid timezone shift in UTC-3 etc.
        const useUtc = val.getUTCHours() === 0 && val.getUTCMinutes() === 0
        const d = String(useUtc ? val.getUTCDate() : val.getDate()).padStart(2, "0")
        const m = String((useUtc ? val.getUTCMonth() : val.getMonth()) + 1).padStart(2, "0")
        const y = useUtc ? val.getUTCFullYear() : val.getFullYear()
        return `${d}/${m}/${y}`
    }
    const clean = String(val).trim()
    if (!clean) return null

    // If it's an Excel serial date number (e.g. 33559 or "33559")
    if (typeof val === "number" || /^\d+(\.\d+)?$/.test(clean)) {
        const num = typeof val === "number" ? val : parseFloat(clean)
        if (!isNaN(num) && num >= 1 && num <= 100000) {
            try {
                const parsed = XLSX.SSF.parse_date_code(num)
                if (parsed && parsed.y >= 1900 && parsed.y <= 2100) {
                    const d = String(parsed.d).padStart(2, "0")
                    const m = String(parsed.m).padStart(2, "0")
                    return `${d}/${m}/${parsed.y}`
                }
            } catch (e) {}
        }
    }

    // If YYYY-MM-DD or YYYY/MM/DD
    if (/^\d{4}[-/]\d{2}[-/]\d{2}/.test(clean)) {
        const parts = clean.substring(0, 10).split(/[-/]/)
        return `${parts[2]}/${parts[1]}/${parts[0]}`
    }

    // If DD-MM-YYYY or DD/MM/YYYY or DD/MM/YY
    if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(clean)) {
        const parts = clean.split(/[-/]/)
        if (parts.length >= 3) {
            const d = parts[0].padStart(2, "0")
            const m = parts[1].padStart(2, "0")
            let y = parseInt(parts[2], 10)
            if (y < 100) {
                y += y > 50 ? 1900 : 2000
            }
            return `${d}/${m}/${y}`
        }
    }

    return clean
}

// Case and accent-insensitive column reader with aliases
function getField(row: Record<string, any>, ...aliases: string[]): any {
    const rowKeys = Object.keys(row)
    for (const alias of aliases) {
        if (row[alias] !== undefined && row[alias] !== null && String(row[alias]).trim() !== "") {
            return row[alias]
        }
        const normAlias = alias.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
        for (const k of rowKeys) {
            const normKey = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
            if (normKey === normAlias && row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") {
                return row[k]
            }
        }
    }
    return null
}

export async function POST(req: NextRequest) {
    try {
        const userId = await getServerUserId(req)
        if (!userId) return unauthorizedResponse()

        const formData = await req.formData()
        const file = formData.get("file") as File
        const companyId = formData.get("companyId") as string

        if (!file || !companyId) {
            return NextResponse.json(
                { error: "Arquivo ou ID da empresa ausente" },
                { status: 400 }
            )
        }

        const hasAccess = await validateCompanyAccess(userId, companyId)
        if (!hasAccess) return forbiddenResponse()

        // Validate spy permissions
        const spyValidation = await validateSpyAction(req, "employees", "edit")
        if (!spyValidation.authorized) {
            return NextResponse.json({ error: spyValidation.reason || "Não autorizado" }, { status: 403 })
        }

        // Validate file size (max 20MB)
        if (file.size > 20 * 1024 * 1024) {
            return NextResponse.json(
                { error: "O arquivo excede o limite máximo permitido de 20MB" },
                { status: 400 }
            )
        }

        // Validate file extension
        const fileName = file.name || ""
        const ext = fileName.split(".").pop()?.toLowerCase()
        if (!ext || !["xlsx", "xls", "csv"].includes(ext)) {
            return NextResponse.json(
                { error: "Formato inválido. Por favor, envie arquivos .xlsx, .xls ou .csv" },
                { status: 400 }
            )
        }

        // Read file array buffer
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Parse with xlsx
        const workbook = XLSX.read(buffer, { type: "buffer", codepage: 65001, raw: true })
        const sheetName = workbook.SheetNames[0]
        if (!sheetName) {
            return NextResponse.json(
                { error: "Planilha vazia ou inválida" },
                { status: 400 }
            )
        }

        const sheet = workbook.Sheets[sheetName]
        const rawRows = XLSX.utils.sheet_to_json<any>(sheet)

        if (rawRows.length === 0) {
            return NextResponse.json(
                { error: "Nenhum funcionário encontrado no arquivo" },
                { status: 400 }
            )
        }

        // Normalize row keys by removing asterisks and trimming extra spaces
        const rows = rawRows
            .map((row: any) => {
                const cleanRow: any = {}
                for (const key of Object.keys(row)) {
                    const cleanKey = key.replace(/\*/g, "").trim()
                    cleanRow[cleanKey] = row[key]
                }
                return cleanRow
            })
            .filter((row: any) => {
                // Filter out completely empty rows
                return Object.values(row).some(v => v !== null && v !== undefined && String(v).trim() !== "")
            })

        if (rows.length === 0) {
            return NextResponse.json(
                { error: "Nenhum funcionário com dados válidos encontrado no arquivo" },
                { status: 400 }
            )
        }

        // Create the Import record
        const newImport = await db.import.create({
            data: {
                companyId,
                arquivo: file.name,
                status: "PENDING",
                total_encontrados: rows.length,
                total_processados: 0,
                total_criados: 0,
                total_falhas: 0,
                criado_por: userId
            }
        })

        // Map rows into ImportItem entries with robust aliases
        const itemsData = rows.map((row: any, index: number) => {
            const nome = getField(row, "Nome", "Name", "Nome Completo")
            const email = getField(row, "Email", "E-mail", "E-Mail", "Correio Eletrônico")
            const cpf = getField(row, "CPF", "Cpf", "Documento")
            const cargo = getField(row, "Cargo", "Position", "Função", "Funcao")
            const genero = getField(row, "Gênero", "Genero", "Sexo", "Gender")
            const nascimento = getField(row, "Data de Nascimento", "Data Nascimento", "Data de nascimento", "Nascimento", "birthDate", "BirthDate")
            const contato = getField(row, "Contato", "Telefone", "Celular", "Phone", "Fone")
            const data_admissao = getField(row, "Data de Admissão", "Data de Admissao", "Data Admissão", "Data Admissao", "Admissão", "Admissao", "admissionDate", "AdmissionDate")
            const cep = getField(row, "CEP", "Cep", "Código Postal")
            const address = getField(row, "Endereço", "Endereco", "Address", "Rua", "Logradouro")
            const number = getField(row, "Número", "Numero", "Number", "Nº", "Num")
            const district = getField(row, "Bairro", "District")
            const city = getField(row, "Cidade", "City", "Município", "Municipio")
            const complement = getField(row, "Complemento", "Complement", "Compl")

            return {
                importacao_id: newImport.id,
                linha_planilha: index + 2, // Excel row 1 is header, row 2 is first data row
                nome: nome ? String(nome).trim() : null,
                email: email ? String(email).trim() : null,
                cpf: cpf ? String(cpf).trim() : null,
                cargo: cargo ? String(cargo).trim() : null,
                genero: genero ? String(genero).trim() : null,
                nascimento: formatExcelDateString(nascimento),
                contato: contato ? String(contato).trim() : null,
                data_admissao: formatExcelDateString(data_admissao),
                cep: cep ? String(cep).trim() : null,
                address: address ? String(address).trim() : null,
                number: number ? String(number).trim() : null,
                district: district ? String(district).trim() : null,
                city: city ? String(city).trim() : null,
                complement: complement ? String(complement).trim() : null,
                costCenterId: null,
                status: "PENDING" as const,
                erro: null,
                dados_originais: JSON.stringify(row)
            }
        })

        // Insert items in bulk
        await db.importItem.createMany({
            data: itemsData
        })

        // Trigger queue processing asynchronously (non-blocking)
        processImportQueue(newImport.id).catch(err => {
            console.error("Background import queue error:", err)
        })

        return NextResponse.json(newImport, { status: 201 })

    } catch (error) {
        console.error("IMPORT UPLOAD ERROR:", error)
        return NextResponse.json(
            { error: "Erro interno ao enviar planilha" },
            { status: 500 }
        )
    }
}
