import { NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url)
        const format = url.searchParams.get("format")

        const headers = [
            { name: "Nome", mandatory: true, key: "nome" },
            { name: "Email", mandatory: true, key: "email" },
            { name: "CPF", mandatory: true, key: "cpf" },
            { name: "RG", mandatory: false, key: "rg" },
            { name: "Cargo", mandatory: true, key: "cargo" },
            { name: "Gênero", mandatory: true, key: "genero" },
            { name: "Data de Nascimento", mandatory: true, key: "nascimento" },
            { name: "Contato", mandatory: true, key: "contato" },
            { name: "Data de Admissão", mandatory: true, key: "data_admissao" },
            { name: "CEP", mandatory: false, key: "cep" },
            { name: "Endereço", mandatory: false, key: "address" },
            { name: "Número", mandatory: false, key: "number" },
            { name: "Bairro", mandatory: false, key: "district" },
            { name: "Cidade", mandatory: false, key: "city" },
            { name: "Complemento", mandatory: false, key: "complement" }
        ]

        const sampleRow = {
            nome: "João da Silva",
            email: "joao@empresa.com",
            cpf: "123.456.789-00",
            rg: "12.345.678-9",
            cargo: "Analista de TI",
            genero: "Masculino",
            nascimento: "15/05/1995",
            contato: "(11) 99999-9999",
            data_admissao: "01/07/2026",
            cep: "01311-000",
            address: "Avenida Paulista",
            number: "1000",
            district: "Bela Vista",
            city: "São Paulo",
            complement: "Apto 42"
        }

        // CSV fallback
        if (format === "csv") {
            const csvHeaders = headers.map(h => h.mandatory ? `${h.name} *` : h.name).join(";")
            const csvSampleValues = headers.map(h => sampleRow[h.key as keyof typeof sampleRow]).join(";")
            const bom = "\uFEFF"
            const csvContent = bom + [csvHeaders, csvSampleValues].join("\n")

            return new NextResponse(csvContent, {
                status: 200,
                headers: {
                    "Content-Type": "text/csv; charset=utf-8",
                    "Content-Disposition": "attachment; filename=template-importacao.csv"
                }
            })
        }

        // Create Excel Workbook
        const workbook = new ExcelJS.Workbook()
        workbook.creator = "emplo_manager"
        workbook.created = new Date()

        // 1. Tab "Funcionários"
        const wsEmployees = workbook.addWorksheet("Funcionários", {
            views: [{ state: "frozen", ySplit: 1 }] // Freeze first row
        })

        // Add headers row
        const headerRow = wsEmployees.getRow(1)
        headerRow.height = 25

        headers.forEach((h, colIdx) => {
            const cell = headerRow.getCell(colIdx + 1)
            
            if (h.mandatory) {
                // Background fill light blue, bold text, red asterisk
                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "FFE2EFDA" } // soft light green/blue pastel background
                }
                cell.value = {
                    richText: [
                        { text: h.name + " ", font: { bold: true, color: { argb: "FF1F4E78" }, name: "Calibri", size: 11 } },
                        { text: "*", font: { bold: true, color: { argb: "FFFF0000" }, name: "Calibri", size: 11 } }
                    ]
                }
            } else {
                // Background gray for optional columns
                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "FFF2F2F2" }
                }
                cell.font = {
                    name: "Calibri",
                    size: 11,
                    bold: true,
                    color: { argb: "FF595959" }
                }
                cell.value = h.name
            }
            
            // Border
            cell.border = {
                bottom: { style: "medium", color: { argb: "FFA6A6A6" } },
                right: { style: "thin", color: { argb: "FFD9D9D9" } }
            }
            cell.alignment = { vertical: "middle", horizontal: "left" }
        })

        // Add sample row
        const dataRow = wsEmployees.getRow(2)
        dataRow.height = 20
        headers.forEach((h, colIdx) => {
            const cell = dataRow.getCell(colIdx + 1)
            cell.value = sampleRow[h.key as keyof typeof sampleRow]
            cell.font = { name: "Calibri", size: 11, italic: true, color: { argb: "FF7F7F7F" } }
            cell.alignment = { vertical: "middle", horizontal: "left" }
            cell.border = {
                bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
                right: { style: "thin", color: { argb: "FFE0E0E0" } }
            }
        })

        // Add dropdown data validation for Gênero (column F / 6) for rows 2 to 1000
        for (let r = 2; r <= 1000; r++) {
            wsEmployees.getCell(`F${r}`).dataValidation = {
                type: "list",
                allowBlank: true,
                formulae: ['"Masculino,Feminino"'],
                showErrorMessage: true,
                errorTitle: "Valor inválido",
                error: "Selecione 'Masculino' ou 'Feminino' na lista suspensa."
            }
        }

        // Formats for date columns
        wsEmployees.getColumn("G").numFmt = "@" // Text format is safer for parsing DD/MM/YYYY text input
        wsEmployees.getColumn("I").numFmt = "@"
        wsEmployees.getColumn("C").numFmt = "@" // CPF as text to preserve leading zeros
        wsEmployees.getColumn("D").numFmt = "@" // RG as text
        wsEmployees.getColumn("H").numFmt = "@" // Contact as text
        wsEmployees.getColumn("J").numFmt = "@" // CEP as text

        // Enable auto filter
        wsEmployees.autoFilter = `A1:${String.fromCharCode(65 + headers.length - 1)}1`

        // Grid lines visible
        wsEmployees.views[0].showGridLines = true

        // 2. Tab "Instruções"
        const wsInstructions = workbook.addWorksheet("Instruções")
        wsInstructions.views = [{ showGridLines: true }]

        // Title row
        wsInstructions.mergeCells("A1:E1")
        const titleCell = wsInstructions.getCell("A1")
        titleCell.value = "INSTRUÇÕES PARA PREENCHIMENTO DO TEMPLATE"
        titleCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFFFF" } }
        titleCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF1F4E78" } // Dark blue
        }
        titleCell.alignment = { vertical: "middle", horizontal: "center" }
        wsInstructions.getRow(1).height = 40

        // Sub-title / Note
        wsInstructions.mergeCells("A2:E2")
        const noteCell = wsInstructions.getCell("A2")
        noteCell.value = "Atenção: Não altere os nomes ou a ordem das colunas da planilha. Campos marcados com * são obrigatórios."
        noteCell.font = { name: "Calibri", size: 10, italic: true, color: { argb: "FFC00000" } }
        noteCell.alignment = { vertical: "middle", horizontal: "left" }
        wsInstructions.getRow(2).height = 25

        // Header Row for instructions
        const instHeaderRow = wsInstructions.getRow(4)
        instHeaderRow.height = 25
        const instHeaders = ["Campo", "Obrigatório", "Formato Esperado", "Exemplo", "Observações Importantes"]
        
        instHeaders.forEach((name, idx) => {
            const cell = instHeaderRow.getCell(idx + 1)
            cell.value = name
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFD9D9D9" }
            }
            cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF333333" } }
            cell.alignment = { vertical: "middle", horizontal: "left" }
            cell.border = {
                bottom: { style: "medium", color: { argb: "FFA6A6A6" } },
                right: { style: "thin", color: { argb: "FFD9D9D9" } }
            }
        })

        // Detailed fields instructions content
        const instructionsData = [
            { campo: "Nome *", obrigatório: "Sim", formato: "Texto livre", exemplo: "João da Silva", obs: "Nome completo do colaborador." },
            { campo: "Email *", obrigatório: "Sim", formato: "E-mail válido", exemplo: "joao@empresa.com", obs: "Endereço de e-mail corporativo ou pessoal. Deve ser único." },
            { campo: "CPF *", obrigatório: "Sim", formato: "CPF válido", exemplo: "123.456.789-00", obs: "CPF brasileiro. Aceita com ou sem pontuação. Deve ser único." },
            { campo: "RG", obrigatório: "Não", formato: "RG válido", exemplo: "12.345.678-9", obs: "Opcional. Documento de Identidade do estado." },
            { campo: "Cargo *", obrigatório: "Sim", formato: "Texto livre", exemplo: "Analista de TI", obs: "Cargo do colaborador." },
            { campo: "Gênero *", obrigatório: "Sim", formato: "Lista suspensa", exemplo: "Masculino", obs: "Escolha apenas entre 'Masculino' ou 'Feminino'." },
            { campo: "Data de Nascimento *", obrigatório: "Sim", formato: "dd/mm/aaaa", exemplo: "15/05/1995", obs: "Data de nascimento do colaborador." },
            { campo: "Contato *", obrigatório: "Sim", formato: "Telefone com DDD", exemplo: "(11) 99999-9999", obs: "Telefone celular ou fixo para contato direto." },
            { campo: "Data de Admissão *", obrigatório: "Sim", formato: "dd/mm/aaaa", exemplo: "01/07/2026", obs: "Data de início do contrato de trabalho." },
            { campo: "CEP", obrigatório: "Não", formato: "CEP válido", exemplo: "01311-000", obs: "Código de Endereçamento Postal." },
            { campo: "Endereço", obrigatório: "Não", formato: "Texto livre", exemplo: "Avenida Paulista", obs: "Logradouro (rua, avenida, etc.)." },
            { campo: "Número", obrigatório: "Não", formato: "Texto livre", exemplo: "1000", obs: "Número da residência." },
            { campo: "Bairro", obrigatório: "Não", formato: "Texto livre", exemplo: "Bela Vista", obs: "Bairro de residência." },
            { campo: "Cidade", obrigatório: "Não", formato: "Texto livre", exemplo: "São Paulo", obs: "Cidade de residência." },
            { campo: "Complemento", obrigatório: "Não", formato: "Texto livre", exemplo: "Apto 42", obs: "Complemento do endereço." }
        ]

        instructionsData.forEach((row, i) => {
            const r = wsInstructions.getRow(5 + i)
            r.height = 22
            
            const cellCampo = r.getCell(1)
            cellCampo.value = row.campo
            cellCampo.font = { name: "Calibri", size: 10, bold: true }
            
            const cellObrigatorio = r.getCell(2)
            cellObrigatorio.value = row.obrigatório
            cellObrigatorio.font = { name: "Calibri", size: 10, bold: row.obrigatório === "Sim", color: { argb: row.obrigatório === "Sim" ? "FFC00000" : "FF595959" } }
            
            r.getCell(3).value = row.formato
            r.getCell(4).value = row.exemplo
            r.getCell(5).value = row.obs

            // Styling for instruction lines
            for (let col = 1; col <= 5; col++) {
                const cell = r.getCell(col)
                cell.font = cell.font || { name: "Calibri", size: 10 }
                cell.border = {
                    bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
                    right: { style: "thin", color: { argb: "FFE0E0E0" } }
                }
                cell.alignment = { vertical: "middle", horizontal: "left" }
            }
        })

        // Auto-fit column widths for both sheets
        const autoFitWidth = (worksheet: ExcelJS.Worksheet) => {
            worksheet.columns?.forEach((column) => {
                let maxLen = 12
                if (column && column.eachCell) {
                    column.eachCell({ includeEmpty: true }, (cell) => {
                        if (cell.value) {
                            let valStr = ""
                            if (typeof cell.value === "object" && "richText" in cell.value) {
                                valStr = cell.value.richText.map(rt => rt.text).join("")
                            } else {
                                valStr = cell.value.toString()
                            }
                            if (valStr.length > maxLen) {
                                maxLen = valStr.length
                            }
                        }
                    })
                }
                column.width = maxLen + 4
            })
        }

        autoFitWidth(wsEmployees)
        autoFitWidth(wsInstructions)

        // Write workbook to buffer
        const buffer = await workbook.xlsx.writeBuffer()

        // Set response headers and return binary Excel file
        const response = new NextResponse(buffer as any, {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": "attachment; filename=template-importacao.xlsx",
                "Cache-Control": "no-store, no-cache, must-revalidate"
            }
        })

        return response
    } catch (error) {
        console.error("TEMPLATE GENERATION ERROR:", error)
        return NextResponse.json(
            { error: "Erro ao gerar template Excel" },
            { status: 500 }
        )
    }
}
