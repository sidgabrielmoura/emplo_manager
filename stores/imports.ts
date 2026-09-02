import { proxy } from "valtio"

export interface ImportRecord {
    id: number
    companyId: string
    arquivo: string
    status: "PENDING" | "PROCESSING" | "PAUSED" | "COMPLETED" | "COMPLETED_WITH_ERRORS" | "FAILED" | "CANCELLED"
    iniciado_em: string
    finalizado_em?: string | null
    total_encontrados: number
    total_processados: number
    total_criados: number
    total_falhas: number
    tempo_execucao?: string | null
    criado_por: string
}

export interface ImportItemRecord {
    id: string
    importacao_id: number
    linha_planilha: number
    nome?: string | null
    email?: string | null
    cpf?: string | null
    cargo?: string | null
    genero?: string | null
    nascimento?: string | null
    contato?: string | null
    data_admissao?: string | null
    cep?: string | null
    address?: string | null
    number?: string | null
    district?: string | null
    city?: string | null
    complement?: string | null
    costCenterId?: string | null
    status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"
    erro?: string | null
    funcionario_id?: string | null
    criado_em: string
}

export interface ImportWithItems extends ImportRecord {
    items: ImportItemRecord[]
}

export const useImportsStore = proxy({
    imports: null as ImportRecord[] | null,
    activeImport: null as ImportWithItems | null,
    loading: false,
    uploading: false,
    processingItem: null as string | null // holds itemId being corrected
})
