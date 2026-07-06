import * as XLSX from "xlsx"
import db from "@/lib/prisma"
import { getServerUserId, unauthorizedResponse, validateCompanyAccess, forbiddenResponse } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { processImportQueue } from "@/lib/import-queue"

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

        // Read file array buffer
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Parse with xlsx
        const workbook = XLSX.read(buffer, { type: "buffer" })
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
        const rows = rawRows.map((row: any) => {
            const cleanRow: any = {}
            for (const key of Object.keys(row)) {
                const cleanKey = key.replace(/\*/g, "").trim()
                cleanRow[cleanKey] = row[key]
            }
            return cleanRow
        })

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

        // Map rows into ImportItem entries
        const itemsData = rows.map((row: any, index: number) => {
            const nome = row["Nome"] || row["nome"] || row["Name"] || row["name"]
            const email = row["Email"] || row["email"] || row["E-mail"] || row["e-mail"]
            const cpf = row["CPF"] || row["cpf"] || row["Cpf"]
            const rg = row["RG"] || row["rg"] || row["Rg"]
            const cargo = row["Cargo"] || row["cargo"] || row["Position"] || row["position"]
            const genero = row["Gênero"] || row["genero"] || row["gender"] || row["Gender"]
            const nascimento = row["Data de Nascimento"] || row["Nascimento"] || row["nascimento"] || row["birthDate"] || row["BirthDate"]
            const contato = row["Contato"] || row["contato"] || row["Telefone"] || row["telefone"] || row["phone"] || row["Phone"]
            const data_admissao = row["Data de Admissão"] || row["Admissão"] || row["data_admissao"] || row["admissionDate"] || row["AdmissionDate"]
            const cep = row["CEP"] || row["cep"] || row["Cep"]
            const address = row["Endereço"] || row["endereco"] || row["Address"] || row["address"]
            const number = row["Número"] || row["numero"] || row["Number"] || row["number"]
            const district = row["Bairro"] || row["bairro"] || row["District"] || row["district"]
            const city = row["Cidade"] || row["cidade"] || row["City"] || row["city"]
            const complement = row["Complemento"] || row["complemento"] || row["Complement"] || row["complement"]

            return {
                importacao_id: newImport.id,
                linha_planilha: index + 2, // Excel row 1 is header, row 2 is first data row
                nome: nome ? String(nome).trim() : null,
                email: email ? String(email).trim() : null,
                cpf: cpf ? String(cpf).trim() : null,
                cargo: cargo ? String(cargo).trim() : null,
                genero: genero ? String(genero).trim() : null,
                nascimento: nascimento ? String(nascimento).trim() : null,
                contato: contato ? String(contato).trim() : null,
                data_admissao: data_admissao ? String(data_admissao).trim() : null,
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
