"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useSnapshot } from "valtio"
import { toast } from "sonner"
import {
    ChevronLeft,
    Upload,
    Trash2,
    Loader2,
    FileSpreadsheet,
    Download,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    ChevronDown,
    ChevronUp,
    Settings,
    Edit2,
    Search,
    AlertCircle,
    User,
    Calendar,
    Briefcase,
    Mail,
    Phone,
    MapPin,
    Building2,
    Clock,
    RotateCw,
    Pause,
    Play,
    AlertOctagon
} from "lucide-react"

import { useCompanyStore } from "@/stores/company"
import { useImportsStore, ImportRecord, ImportItemRecord } from "@/stores/imports"
import { useCostCentersStore } from "@/stores/cost-centers"
import {
    getImports,
    getImportDetails,
    uploadImportFile,
    correctImportItem,
    retryImport,
    pauseImport,
    resumeImport,
    deleteImport,
    clearImportHistory,
    getCostCenters
} from "@/actions/requests"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { maskCPF, maskPhone } from "@/helpers"

// Helper to render Import Status Badge
function ImportStatusBadge({ status }: { status: string }) {
    switch (status) {
        case "PENDING":
            return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 font-semibold animate-pulse">Aguardando</Badge>
        case "PROCESSING":
            return (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-semibold flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                    Processando
                </Badge>
            )
        case "PAUSED":
            return (
                <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-semibold flex items-center gap-1.5">
                    <Pause className="w-3 h-3 text-amber-600" />
                    Pausado
                </Badge>
            )
        case "COMPLETED":
            return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold">Concluído</Badge>
        case "COMPLETED_WITH_ERRORS":
            return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-semibold">Concluído com Falhas</Badge>
        case "FAILED":
            return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 font-semibold">Erro Geral</Badge>
        case "CANCELLED":
            return <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 font-semibold">Cancelado</Badge>
        default:
            return <Badge variant="outline">{status}</Badge>
    }
}

// Helper to render Item Status Icon/Loader
function ItemStatusIndicator({ status, errorMsg }: { status: string; errorMsg?: string | null }) {
    switch (status) {
        case "PENDING":
            return <div className="size-5 rounded-full border-2 border-slate-200 bg-slate-50 shrink-0" title="Aguardando processamento" />
        case "PROCESSING":
            return <Loader2 className="size-5 text-blue-600 animate-spin shrink-0" />
        case "COMPLETED":
            return (
                <span title="Funcionário criado com sucesso!" className="shrink-0">
                    <CheckCircle2 className="size-5 text-emerald-600" />
                </span>
            )
        case "FAILED":
            return (
                <span title={errorMsg || "Falha na criação"} className="shrink-0">
                    <XCircle className="size-5 text-red-600" />
                </span>
            )
        default:
            return null
    }
}

export function MassCreationContent() {
    const companyStore = useSnapshot(useCompanyStore)
    const importsStore = useSnapshot(useImportsStore)
    const costCentersStore = useSnapshot(useCostCentersStore)

    const companyId = companyStore.company_selected?.id || ""

    // UI States
    const [isUploadOpen, setIsUploadOpen] = useState(false)
    const [dragActive, setDragActive] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [expandedImportId, setExpandedImportId] = useState<number | null>(null)
    const [showOnlyErrors, setShowOnlyErrors] = useState(false)

    // Action Loading States
    const [retryingId, setRetryingId] = useState<number | null>(null)
    const [pausingId, setPausingId] = useState<number | null>(null)
    const [resumingId, setResumingId] = useState<number | null>(null)
    const [deletingId, setDeletingId] = useState<number | null>(null)

    // Delete Modals States
    const [importToDelete, setImportToDelete] = useState<{ id: number; arquivo: string } | null>(null)
    const [isClearHistoryOpen, setIsClearHistoryOpen] = useState(false)
    const [isClearingHistory, setIsClearingHistory] = useState(false)

    // Correction Modal States
    const [isCorrectOpen, setIsCorrectOpen] = useState(false)
    const [currentItem, setCurrentItem] = useState<ImportItemRecord | null>(null)
    const [correctForm, setCorrectForm] = useState({
        nome: "",
        email: "",
        cpf: "",
        cargo: "",
        genero: "",
        nascimento: "",
        contato: "",
        data_admissao: "",
        cep: "",
        address: "",
        number: "",
        district: "",
        city: "",
        complement: "",
        costCenterId: ""
    })

    const fileInputRef = useRef<HTMLInputElement>(null)

    // Load initial history
    useEffect(() => {
        if (companyId) {
            getImports(companyId).catch(console.error)
            getCostCenters(companyId).catch(console.error)
        }
    }, [companyId])

    // Background process auto-polling when imports are running
    useEffect(() => {
        if (!companyId) return

        let pollInterval: NodeJS.Timeout | null = null

        // Check if there is any processing or pending import in the list
        const hasActiveProcessing = importsStore.imports?.some(
            imp => imp.status === "PROCESSING" || imp.status === "PENDING"
        )

        // Or if the active details view is processing
        const isActiveDetailsProcessing = importsStore.activeImport && (
            importsStore.activeImport.status === "PROCESSING" ||
            importsStore.activeImport.status === "PENDING"
        )

        if (hasActiveProcessing || isActiveDetailsProcessing) {
            pollInterval = setInterval(() => {
                // Refresh history
                getImports(companyId).catch(console.error)
                // Refresh details if expanded and processing
                if (expandedImportId) {
                    getImportDetails(expandedImportId).catch(console.error)
                }
            }, 2500)
        }

        return () => {
            if (pollInterval) clearInterval(pollInterval)
        }
    }, [companyId, importsStore.imports, importsStore.activeImport, expandedImportId])

    // Trigger toast notification when an active import finishes
    const prevImportsRef = useRef<ImportRecord[] | null>(null)
    useEffect(() => {
        if (!importsStore.imports || !prevImportsRef.current) {
            prevImportsRef.current = importsStore.imports ? [...importsStore.imports] : null
            return
        }

        importsStore.imports.forEach(current => {
            const previous = prevImportsRef.current?.find(p => p.id === current.id)
            if (previous && previous.status === "PROCESSING" && (current.status === "COMPLETED" || current.status === "COMPLETED_WITH_ERRORS")) {
                toast.success(`Importação #${current.id} concluída!`, {
                    description: `${current.total_encontrados} processados: ${current.total_criados} criados, ${current.total_falhas} com falha.`,
                    duration: 5000
                })
            }
        })

        prevImportsRef.current = [...importsStore.imports]
    }, [importsStore.imports])

    // Toggle expand row
    async function handleExpandRow(importId: number) {
        if (expandedImportId === importId) {
            setExpandedImportId(null)
        } else {
            setExpandedImportId(importId)
            try {
                await getImportDetails(importId)
            } catch (error) {
                toast.error("Erro ao carregar detalhes da importação")
            }
        }
    }

    // Drag and Drop handlers
    function handleDrag(e: React.DragEvent) {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true)
        } else if (e.type === "dragleave") {
            setDragActive(false)
        }
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            validateAndSetFile(e.dataTransfer.files[0])
        }
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        if (e.target.files && e.target.files[0]) {
            validateAndSetFile(e.target.files[0])
        }
    }

    function validateAndSetFile(file: File) {
        const ext = file.name.split(".").pop()?.toLowerCase()
        if (ext === "xlsx" || ext === "xls" || ext === "csv") {
            setSelectedFile(file)
        } else {
            toast.error("Formato inválido. Por favor, envie arquivos .xlsx, .xls ou .csv")
        }
    }

    function removeFile() {
        setSelectedFile(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
    }

    async function handleStartImport() {
        if (!selectedFile || !companyId) return

        try {
            const res = await uploadImportFile(selectedFile, companyId)
            toast.success("Importação iniciada com sucesso!")
            setIsUploadOpen(false)
            setSelectedFile(null)

            // Expand the newly created import to show real-time progress
            if (res && res.id) {
                handleExpandRow(res.id)
            }
        } catch (error: any) {
            const errorMsg = error?.response?.data?.error || "Erro ao fazer upload da planilha"
            toast.error(errorMsg)
        }
    }

    async function handleRetryImport(importId: number) {
        if (!companyId) return
        try {
            setRetryingId(importId)
            await retryImport(importId, companyId)
            toast.success("Reprocessamento das falhas iniciado!")
            if (expandedImportId) {
                await getImportDetails(expandedImportId)
            }
        } catch (error: any) {
            toast.error(error?.response?.data?.error || "Erro ao reprocessar falhas")
        } finally {
            setRetryingId(null)
        }
    }

    async function handlePauseImport(importId: number) {
        if (!companyId) return
        try {
            setPausingId(importId)
            await pauseImport(importId, companyId)
            toast.success("Processamento pausado com sucesso! O ponto exato foi preservado.")
            if (expandedImportId) {
                await getImportDetails(expandedImportId)
            }
        } catch (error: any) {
            toast.error(error?.response?.data?.error || "Erro ao pausar processamento")
        } finally {
            setPausingId(null)
        }
    }

    async function handleResumeImport(importId: number) {
        if (!companyId) return
        try {
            setResumingId(importId)
            await resumeImport(importId, companyId)
            toast.success("Processamento retomado a partir do ponto onde parou!")
            if (expandedImportId) {
                await getImportDetails(expandedImportId)
            }
        } catch (error: any) {
            toast.error(error?.response?.data?.error || "Erro ao retomar processamento")
        } finally {
            setResumingId(null)
        }
    }

    async function handleConfirmDeleteSingle() {
        if (!importToDelete || !companyId) return
        try {
            setDeletingId(importToDelete.id)
            await deleteImport(importToDelete.id, companyId)
            toast.success(`Importação #${importToDelete.id} excluída do histórico!`)
            if (expandedImportId === importToDelete.id) {
                setExpandedImportId(null)
            }
            setImportToDelete(null)
        } catch (error: any) {
            toast.error(error?.response?.data?.error || "Erro ao excluir importação")
        } finally {
            setDeletingId(null)
        }
    }

    async function handleConfirmClearHistory() {
        if (!companyId) return
        try {
            setIsClearingHistory(true)
            await clearImportHistory(companyId)
            toast.success("Todo o histórico de importações foi limpo com sucesso!")
            setExpandedImportId(null)
            setIsClearHistoryOpen(false)
        } catch (error: any) {
            toast.error(error?.response?.data?.error || "Erro ao limpar histórico de importações")
        } finally {
            setIsClearingHistory(false)
        }
    }

    // Helper to format raw date for display in correction form
    function formatRawDate(val: string | null | undefined): string {
        if (!val) return ""
        const clean = val.trim()
        if (/^\d+(\.\d+)?$/.test(clean)) {
            const num = parseFloat(clean)
            if (num >= 1000 && num <= 100000) {
                const date = new Date((num - 25569) * 86400 * 1000)
                if (!isNaN(date.getTime())) {
                    const d = String(date.getUTCDate()).padStart(2, "0")
                    const m = String(date.getUTCMonth() + 1).padStart(2, "0")
                    const y = date.getUTCFullYear()
                    return `${d}/${m}/${y}`
                }
            }
        }
        if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
            const parts = clean.substring(0, 10).split("-")
            return `${parts[2]}/${parts[1]}/${parts[0]}`
        }
        return clean
    }

    // Correction Modal Handlers
    function handleOpenCorrection(item: ImportItemRecord) {
        setCurrentItem(item)
        setCorrectForm({
            nome: item.nome || "",
            email: item.email || "",
            cpf: item.cpf || "",
            cargo: item.cargo || "",
            genero: item.genero || "",
            nascimento: formatRawDate(item.nascimento),
            contato: item.contato || "",
            data_admissao: formatRawDate(item.data_admissao),
            cep: item.cep || "",
            address: item.address || "",
            number: item.number || "",
            district: item.district || "",
            city: item.city || "",
            complement: item.complement || "",
            costCenterId: item.costCenterId || ""
        })
        setIsCorrectOpen(true)
    }

    async function handleSaveCorrection() {
        if (!currentItem || !companyId) return

        try {
            const res = await correctImportItem(currentItem.id, correctForm, companyId)
            if (res.success) {
                toast.success("Funcionário criado com sucesso!")
                setIsCorrectOpen(false)
                setCurrentItem(null)
                // Refresh details
                if (expandedImportId) {
                    await getImportDetails(expandedImportId)
                }
            } else {
                toast.error(res.errorMsg || "Erro na validação dos campos. Verifique e tente novamente.")
                // Refresh stats and state to show new validation errors
                if (res.item) {
                    setCurrentItem(res.item)
                }
            }
        } catch (error: any) {
            toast.error(error?.response?.data?.error || "Erro ao criar funcionário")
        }
    }

    // Check if field contains errors
    function getFieldError(fieldName: string): string | null {
        if (!currentItem || !currentItem.erro) return null
        const errorText = currentItem.erro.toLowerCase()

        switch (fieldName) {
            case "nome":
                return errorText.includes("nome") ? "Nome é obrigatório" : null
            case "email":
                if (errorText.includes("email com formato inválido")) return "Formato de e-mail inválido"
                if (errorText.includes("email já cadastrado")) return "E-mail já está em uso"
                if (errorText.includes("email é obrigatório")) return "E-mail é obrigatório"
                return null
            case "cpf":
                if (errorText.includes("cpf inválido")) return "CPF inválido"
                if (errorText.includes("dígitos")) return "CPF deve conter entre 11 e 14 dígitos"
                if (errorText.includes("cpf já cadastrado")) return "CPF já está cadastrado"
                if (errorText.includes("cpf é obrigatório")) return "CPF é obrigatório"
                return null
            case "cargo":
                return errorText.includes("cargo") ? "Cargo é obrigatório" : null
            case "genero":
                if (errorText.includes("gênero inválido")) return "Gênero inválido (Homem/Mulher)"
                if (errorText.includes("gênero é obrigatório")) return "Gênero é obrigatório"
                return null
            case "nascimento":
                if (errorText.includes("data de nascimento inválida")) return "Data de nascimento inválida"
                if (errorText.includes("data de nascimento é obrigatória")) return "Data de nascimento é obrigatória"
                return null
            case "contato":
                return errorText.includes("contato") ? "Contato é obrigatório" : null
            case "data_admissao":
                if (errorText.includes("data de admissão inválida")) return "Data de admissão inválida"
                if (errorText.includes("data de admissão é obrigatória")) return "Data de admissão é obrigatória"
                return null
            default:
                return null
        }
    }

    return (
        <main className="space-y-6">
            {/* Top Navigation / Breadcrumb */}
            <div className="flex items-center gap-2">
                <Link
                    href="/employees"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Voltar para Funcionários
                </Link>
            </div>

            {/* Header Section */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
                        Criação em Massa de Funcionários
                    </h1>
                    <p className="text-xs text-muted-foreground">
                        Importe múltiplos funcionários de uma só vez através de planilhas Excel ou CSV estruturadas.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <a
                        href="/api/employees/import/template"
                        download="modelo_importacao_funcionarios.xlsx"
                        className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-sm transition-all"
                    >
                        <Download className="w-4 h-4 text-slate-500" />
                        Baixar Modelo
                    </a>

                    <Button
                        onClick={() => setIsUploadOpen(true)}
                        className="text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold text-xs h-9 px-4 shadow-sm cursor-pointer"
                    >
                        <Upload className="w-4 h-4 mr-1.5" />
                        Nova Importação
                    </Button>
                </div>
            </header>

            <Separator />

            <Card className="rounded-3xl p-0 border-slate-100 shadow-sm bg-white overflow-hidden">
                <CardHeader className="p-6 pb-4 border-b border-slate-50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <CardTitle className="text-base font-bold text-slate-800">Histórico de Importações</CardTitle>
                            <CardDescription className="text-xs">
                                Veja o progresso, controle a execução (pausa/retomada) e audite os lotes processados (tempo limite de 5 minutos por execução).
                            </CardDescription>
                        </div>
                        {importsStore.imports && importsStore.imports.length > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsClearHistoryOpen(true)}
                                className="h-8 px-3 text-xs font-bold text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 rounded-xl flex items-center gap-1.5 cursor-pointer shrink-0"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Limpar Histórico
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {importsStore.loading && !importsStore.imports ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-2" />
                            <p className="text-slate-500 text-sm font-medium">Carregando histórico...</p>
                        </div>
                    ) : !importsStore.imports || importsStore.imports.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                            <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mb-3">
                                <FileSpreadsheet className="w-6 h-6 text-slate-400" />
                            </div>
                            <h4 className="text-slate-800 font-bold text-sm">Nenhuma importação encontrada</h4>
                            <p className="text-slate-400 text-xs mt-1 max-w-sm">
                                Faça upload do seu primeiro arquivo de planilhas para cadastrar funcionários em lote.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            {/* History Table */}
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                        <th className="py-3 px-4 font-bold">Lote ID</th>
                                        <th className="py-3 px-4 font-bold">Arquivo</th>
                                        <th className="py-3 px-4 font-bold">Status</th>
                                        <th className="py-3 px-4 font-bold hidden md:table-cell">Hora Início</th>
                                        <th className="py-3 px-4 font-bold text-center">Registros</th>
                                        <th className="py-3 px-4 font-bold text-center text-emerald-600">Sucessos</th>
                                        <th className="py-3 px-4 font-bold text-center text-red-500">Falhas</th>
                                        <th className="py-3 px-4 font-bold hidden md:table-cell">Duração</th>
                                        <th className="py-3 px-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {importsStore.imports.map((imp) => {
                                        const isExpanded = expandedImportId === imp.id
                                        const isProcessing = imp.status === "PROCESSING"
                                        const isPaused = imp.status === "PAUSED"
                                        const hasProgress = isProcessing || imp.status === "PENDING"
                                        const progressPercent = imp.total_encontrados > 0
                                            ? Math.round((imp.total_processados / imp.total_encontrados) * 100)
                                            : 0

                                        return (
                                            <>
                                                {/* Parent Row */}
                                                <tr
                                                    key={imp.id}
                                                    className={`border-b border-slate-100 transition-colors duration-150 hover:bg-slate-50/30 ${isExpanded ? 'bg-slate-50/20' : ''}`}
                                                >
                                                    <td className="py-4 px-4 font-bold text-slate-800 text-xs">
                                                        #{imp.id}
                                                    </td>
                                                    <td className="py-4 px-4 font-semibold text-slate-700 text-xs max-w-[150px] truncate" title={imp.arquivo}>
                                                        {imp.arquivo}
                                                    </td>
                                                    <td className="py-4 px-4 text-xs">
                                                        <ImportStatusBadge status={imp.status} />
                                                    </td>
                                                    <td className="py-4 px-4 text-slate-500 font-medium text-xs hidden md:table-cell">
                                                        {new Date(imp.iniciado_em).toLocaleTimeString("pt-BR", {
                                                             hour: "2-digit",
                                                             minute: "2-digit",
                                                             second: "2-digit"
                                                        })}
                                                    </td>
                                                    <td className="py-4 px-4 text-center font-bold text-slate-600 text-xs">
                                                        {imp.total_encontrados}
                                                    </td>
                                                    <td className="py-4 px-4 text-center font-bold text-emerald-600 text-xs">
                                                        {imp.total_criados}
                                                    </td>
                                                    <td className="py-4 px-4 text-center font-bold text-red-500 text-xs">
                                                        {imp.total_falhas}
                                                    </td>
                                                    <td className="py-4 px-4 text-slate-500 font-semibold text-xs hidden md:table-cell">
                                                        {imp.tempo_execucao || (hasProgress ? "-" : "0s")}
                                                    </td>
                                                    <td className="py-4 px-4 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            {/* Pause / Resume Controls */}
                                                            {isProcessing && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handlePauseImport(imp.id)}
                                                                    disabled={pausingId === imp.id}
                                                                    className="h-7 px-2 text-[10px] font-bold text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100 rounded-lg flex items-center gap-1 cursor-pointer"
                                                                    title="Pausar processamento"
                                                                >
                                                                    {pausingId === imp.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Pause className="w-3 h-3" />}
                                                                    <span className="hidden sm:inline">Pausar</span>
                                                                </Button>
                                                            )}

                                                            {isPaused && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleResumeImport(imp.id)}
                                                                    disabled={resumingId === imp.id}
                                                                    className="h-7 px-2 text-[10px] font-bold text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 rounded-lg flex items-center gap-1 cursor-pointer"
                                                                    title="Continuar processamento"
                                                                >
                                                                    {resumingId === imp.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-emerald-600" />}
                                                                    <span className="hidden sm:inline">Continuar</span>
                                                                </Button>
                                                            )}

                                                            {/* Delete Individual Import Button */}
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => setImportToDelete({ id: imp.id, arquivo: imp.arquivo })}
                                                                disabled={isProcessing}
                                                                className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                                                title="Excluir importação do histórico"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </Button>

                                                            {/* Expand Button */}
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleExpandRow(imp.id)}
                                                                className="h-7 w-7 p-0 rounded-lg cursor-pointer"
                                                            >
                                                                {isExpanded ? (
                                                                    <ChevronUp className="w-4 h-4 text-slate-500" />
                                                                ) : (
                                                                    <ChevronDown className="w-4 h-4 text-slate-500" />
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>

                                                {/* Expanded Details Row */}
                                                {isExpanded && (
                                                    <tr className="bg-slate-50/20 border-b border-slate-100">
                                                        <td colSpan={9} className="p-4 lg:p-6 bg-slate-50/30">
                                                            {/* Real-time Progress Bar */}
                                                            {(hasProgress || isPaused) && (
                                                                <div className="mb-6 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                                                    <div className="flex justify-between items-center text-xs font-bold text-slate-600 mb-2">
                                                                        <span className="flex items-center gap-2">
                                                                            <span>Progresso do Processamento</span>
                                                                            {isPaused && (
                                                                                <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-200">
                                                                                    Pausado
                                                                                </Badge>
                                                                            )}
                                                                        </span>
                                                                        <span className="text-emerald-700">{progressPercent}% ({imp.total_processados} de {imp.total_encontrados} linhas)</span>
                                                                    </div>
                                                                    <Progress value={progressPercent} className="h-2.5 rounded-full bg-slate-100 [&>div]:bg-emerald-600" />
                                                                    <div className="flex flex-wrap gap-4 mt-3 text-[11px] font-bold text-slate-400">
                                                                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Criados: {imp.total_criados}</span>
                                                                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Falhas: {imp.total_falhas}</span>
                                                                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Restantes: {imp.total_encontrados - imp.total_processados}</span>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                                                                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Lista de Funcionários Encontrados</h5>
                                                                {importsStore.activeImport?.id === imp.id && (
                                                                    <div className="flex flex-wrap items-center gap-3">
                                                                        {isProcessing && (
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                onClick={() => handlePauseImport(imp.id)}
                                                                                disabled={pausingId === imp.id}
                                                                                className="h-7 px-2.5 text-[10px] font-bold text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-none"
                                                                            >
                                                                                {pausingId === imp.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Pause className="w-3 h-3" />}
                                                                                Pausar Processamento
                                                                            </Button>
                                                                        )}

                                                                        {isPaused && (
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                onClick={() => handleResumeImport(imp.id)}
                                                                                disabled={resumingId === imp.id}
                                                                                className="h-7 px-2.5 text-[10px] font-bold text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-none"
                                                                            >
                                                                                {resumingId === imp.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-emerald-600" />}
                                                                                Continuar Processamento
                                                                            </Button>
                                                                        )}

                                                                        {imp.total_falhas > 0 && !isProcessing && (
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                onClick={() => handleRetryImport(imp.id)}
                                                                                disabled={retryingId === imp.id}
                                                                                className="h-7 px-2.5 text-[10px] font-bold text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-none"
                                                                            >
                                                                                <RotateCw className={`w-3 h-3 ${retryingId === imp.id ? 'animate-spin' : ''}`} />
                                                                                Reprocessar {imp.total_falhas} {imp.total_falhas === 1 ? "falha" : "falhas"}
                                                                            </Button>
                                                                        )}

                                                                        <label className="flex items-center gap-1.5 cursor-pointer select-none text-[10px] font-bold text-slate-500 hover:text-slate-700">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={showOnlyErrors}
                                                                                onChange={(e) => setShowOnlyErrors(e.target.checked)}
                                                                                className="w-3.5 h-3.5 rounded border-slate-300 accent-emerald-600 cursor-pointer"
                                                                            />
                                                                            Exibir apenas erros
                                                                        </label>
                                                                        <span className="text-[10px] text-muted-foreground font-semibold">
                                                                            Total: {importsStore.activeImport?.items.length} itens
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Expanded Sub-items List */}
                                                            {!importsStore.activeImport || importsStore.activeImport.id !== imp.id ? (
                                                                <div className="flex items-center justify-center py-10">
                                                                    <Loader2 className="w-6 h-6 text-emerald-600 animate-spin mr-2" />
                                                                    <span className="text-xs text-slate-500 font-medium">Carregando detalhes do lote...</span>
                                                                </div>
                                                            ) : importsStore.activeImport.items.length === 0 ? (
                                                                <p className="text-xs text-slate-400 text-center py-4">Nenhum funcionário encontrado.</p>
                                                            ) : (
                                                                <div className="border border-slate-100 rounded-2xl bg-white overflow-hidden shadow-sm">
                                                                    <div className="overflow-x-auto max-h-[350px]">
                                                                        <table className="w-full text-left border-collapse text-xs">
                                                                            <thead>
                                                                                <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase">
                                                                                    <th className="py-2 px-3 text-center">Linha</th>
                                                                                    <th className="py-2 px-3">Nome</th>
                                                                                    <th className="py-2 px-3">CPF</th>
                                                                                    <th className="py-2 px-3">E-mail</th>
                                                                                    <th className="py-2 px-3">Cargo</th>
                                                                                    <th className="py-2 px-3 text-center">Status</th>
                                                                                    <th className="py-2 px-3">Erro Detalhado</th>
                                                                                    <th className="py-2 px-3 text-right">Ação</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {(() => {
                                                                                    const filteredItems = showOnlyErrors
                                                                                        ? importsStore.activeImport.items.filter(i => i.status === "FAILED")
                                                                                        : importsStore.activeImport.items

                                                                                    if (filteredItems.length === 0) {
                                                                                        return (
                                                                                            <tr>
                                                                                                <td colSpan={8} className="py-8 text-center text-slate-400 font-semibold">
                                                                                                    Nenhum funcionário encontrado {showOnlyErrors ? "com erro" : ""}.
                                                                                                </td>
                                                                                            </tr>
                                                                                        )
                                                                                    }

                                                                                    return filteredItems.map((item) => (
                                                                                        <tr
                                                                                            key={item.id}
                                                                                            className={`border-b border-slate-50 last:border-0 hover:bg-slate-50/30 transition-colors duration-150 ${item.status === 'FAILED' ? 'bg-red-50/10' : ''}`}
                                                                                        >
                                                                                            <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                                                                                                {item.linha_planilha}
                                                                                            </td>
                                                                                            <td className="py-2.5 px-3 font-bold text-slate-700 truncate max-w-[120px]" title={item.nome || ""}>
                                                                                                {item.nome || <span className="text-red-400 italic">Vazio</span>}
                                                                                            </td>
                                                                                            <td className="py-2.5 px-3 font-semibold text-slate-600">
                                                                                                {item.cpf ? maskCPF(item.cpf) : <span className="text-red-400 italic">Vazio</span>}
                                                                                            </td>
                                                                                            <td className="py-2.5 px-3 font-medium text-slate-600 truncate max-w-[150px]" title={item.email || ""}>
                                                                                                {item.email || <span className="text-red-400 italic">Vazio</span>}
                                                                                            </td>
                                                                                            <td className="py-2.5 px-3 text-slate-600 truncate max-w-[100px]" title={item.cargo || ""}>
                                                                                                {item.cargo || <span className="text-red-400 italic">Vazio</span>}
                                                                                            </td>
                                                                                            <td className="py-2.5 px-3">
                                                                                                <div className="flex items-center justify-center">
                                                                                                    <ItemStatusIndicator status={item.status} errorMsg={item.erro} />
                                                                                                </div>
                                                                                            </td>
                                                                                            <td className="py-2.5 px-3 text-[11px] font-semibold text-red-500 max-w-[200px] truncate" title={item.erro || ""}>
                                                                                                {item.erro ? (
                                                                                                    <span className="flex items-center gap-1">
                                                                                                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                                                                                                        {item.erro}
                                                                                                    </span>
                                                                                                ) : "-"}
                                                                                            </td>
                                                                                            <td className="py-2.5 px-3 text-right">
                                                                                                {item.status === "FAILED" && (
                                                                                                    <Button
                                                                                                        variant="ghost"
                                                                                                        onClick={() => handleOpenCorrection(item)}
                                                                                                        className="h-7 px-2 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-lg font-bold text-[10px] cursor-pointer flex items-center gap-1 ml-auto"
                                                                                                    >
                                                                                                        <Edit2 className="w-3 h-3" />
                                                                                                        Corrigir
                                                                                                    </Button>
                                                                                                )}
                                                                                            </td>
                                                                                        </tr>
                                                                                    ))
                                                                                })()}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                )}
                                            </>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 1. File Upload Dialog */}
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                <DialogContent className="sm:max-w-[650px] rounded-3xl p-6 border-slate-100 bg-white">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black text-slate-800">Nova Importação</DialogTitle>
                        <DialogDescription className="text-xs">
                            Faça upload do arquivo Excel ou CSV com os dados estruturados dos novos funcionários.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid md:grid-cols-[1fr_260px] gap-6 mt-2">
                        {/* Left Side: Upload Zone */}
                        <div className="space-y-4 flex flex-col justify-between">
                            {/* Drag and Drop Container */}
                            <div
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200 min-h-[140px] flex-1 ${dragActive ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-200 hover:border-emerald-400 bg-slate-50/50'}`}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    accept=".xlsx,.xls,.csv"
                                    onChange={handleFileChange}
                                />

                                {selectedFile ? (
                                    <>
                                        <FileSpreadsheet className="w-10 h-10 text-emerald-600 animate-bounce" />
                                        <div className="text-center">
                                            <p className="text-sm font-bold text-slate-700 max-w-[200px] truncate" title={selectedFile.name}>
                                                {selectedFile.name}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                {(selectedFile.size / 1024).toFixed(1)} KB
                                            </p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-8 h-8 text-slate-400" />
                                        <div className="text-center">
                                            <p className="text-xs font-bold text-slate-700">
                                                Arraste seu arquivo aqui ou <span className="text-emerald-600 underline">clique para selecionar</span>
                                            </p>
                                            <p className="text-[10px] text-slate-400 mt-1">
                                                Formatos suportados: .xlsx, .xls ou .csv (Máx. 20MB)
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>

                            {selectedFile && (
                                <div className="flex items-center justify-between p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                                    <div className="flex items-center gap-2 truncate">
                                        <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                                        <span className="text-xs font-bold text-emerald-900 truncate">
                                            {selectedFile.name}
                                        </span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={removeFile}
                                        className="h-6 w-6 p-0 text-slate-400 hover:text-red-600 rounded-md cursor-pointer"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Right Side: Information / Help Box */}
                        <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 flex flex-col justify-between space-y-3">
                            <div className="space-y-2">
                                <h6 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                    <AlertCircle className="w-4 h-4 text-emerald-600" />
                                    Dicas de Importação
                                </h6>
                                <ul className="text-[11px] text-slate-500 space-y-1.5 list-disc pl-4 leading-relaxed">
                                    <li>Utilize o modelo oficial para evitar erros de leitura nas colunas.</li>
                                    <li>Campos obrigatórios: Nome, CPF, Email, Cargo, Gênero, Nascimento, Contato e Data de Admissão.</li>
                                    <li>O tempo limite contínuo por lote é de 5 minutos, podendo ser pausado e retomado a qualquer momento.</li>
                                </ul>
                            </div>

                            <a
                                href="/api/employees/import/template"
                                download="modelo_importacao_funcionarios.xlsx"
                                className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-emerald-700 bg-emerald-100/50 hover:bg-emerald-100 rounded-xl transition-colors text-center"
                            >
                                <Download className="w-3.5 h-3.5" />
                                Baixar Planilha Modelo
                            </a>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 mt-4 sm:justify-end">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsUploadOpen(false)
                                setSelectedFile(null)
                            }}
                            className="rounded-xl cursor-pointer"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleStartImport}
                            disabled={!selectedFile || importsStore.uploading}
                            className="text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold cursor-pointer"
                        >
                            {importsStore.uploading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Processando...
                                </>
                            ) : (
                                "Iniciar Importação"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 2. Correction Dialog */}
            <Dialog open={isCorrectOpen} onOpenChange={setIsCorrectOpen}>
                <DialogContent className="sm:max-w-[700px] rounded-3xl p-6 border-slate-100 bg-white max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black text-slate-800">
                            Corrigir e Cadastrar Funcionário (Linha {currentItem?.linha_planilha})
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Corrija as inconsistências para criar o funcionário e seus documentos/treinamentos padrões.
                        </DialogDescription>
                    </DialogHeader>

                    {currentItem?.erro && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-2xl flex gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <h6 className="text-[11px] font-bold text-red-700">Erros identificados:</h6>
                                <p className="text-[10px] text-red-600 leading-normal">{currentItem.erro}</p>
                            </div>
                        </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-4 mt-2">
                        {/* Name Field */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700">Nome</Label>
                            <Input
                                value={correctForm.nome}
                                onChange={(e) => setCorrectForm({ ...correctForm, nome: e.target.value })}
                                className={`h-10 rounded-xl ${getFieldError("nome") ? 'border-red-500 focus-visible:ring-red-500 bg-red-50/10' : ''}`}
                            />
                            {getFieldError("nome") && (
                                <p className="text-[10px] text-red-500 font-semibold flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> {getFieldError("nome")}
                                </p>
                            )}
                        </div>

                        {/* Email Field */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700">E-mail</Label>
                            <Input
                                value={correctForm.email}
                                onChange={(e) => setCorrectForm({ ...correctForm, email: e.target.value })}
                                className={`h-10 rounded-xl ${getFieldError("email") ? 'border-red-500 focus-visible:ring-red-500 bg-red-50/10' : ''}`}
                            />
                            {getFieldError("email") && (
                                <p className="text-[10px] text-red-500 font-semibold flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> {getFieldError("email")}
                                </p>
                            )}
                        </div>

                        {/* CPF Field */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700">CPF</Label>
                            <Input
                                value={correctForm.cpf}
                                onChange={(e) => setCorrectForm({ ...correctForm, cpf: maskCPF(e.target.value) })}
                                className={`h-10 rounded-xl ${getFieldError("cpf") ? 'border-red-500 focus-visible:ring-red-500 bg-red-50/10' : ''}`}
                            />
                            {getFieldError("cpf") && (
                                <p className="text-[10px] text-red-500 font-semibold flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> {getFieldError("cpf")}
                                </p>
                            )}
                        </div>

                        {/* Cargo/Position Field */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700">Cargo</Label>
                            <Input
                                value={correctForm.cargo}
                                onChange={(e) => setCorrectForm({ ...correctForm, cargo: e.target.value })}
                                className={`h-10 rounded-xl ${getFieldError("cargo") ? 'border-red-500 focus-visible:ring-red-500 bg-red-50/10' : ''}`}
                            />
                            {getFieldError("cargo") && (
                                <p className="text-[10px] text-red-500 font-semibold flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> {getFieldError("cargo")}
                                </p>
                            )}
                        </div>

                        {/* Genero/Gender Field */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700">Gênero</Label>
                            <Select
                                value={
                                    (correctForm.genero || "").toUpperCase() === "HOMEM" ||
                                        (correctForm.genero || "").toUpperCase() === "MALE" ||
                                        (correctForm.genero || "").toUpperCase() === "MASCULINO"
                                        ? "MALE"
                                        : (correctForm.genero || "").toUpperCase() === "MULHER" ||
                                            (correctForm.genero || "").toUpperCase() === "FEMALE" ||
                                            (correctForm.genero || "").toUpperCase() === "FEMININO"
                                            ? "FEMALE"
                                            : ""
                                }
                                onValueChange={(val) => setCorrectForm({ ...correctForm, genero: val })}
                            >
                                <SelectTrigger className={`h-10 w-full rounded-xl ${getFieldError("genero") ? 'border-red-500 focus:ring-red-500 bg-red-50/10' : ''}`}>
                                    <SelectValue placeholder="Selecione Gênero" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-slate-100 rounded-xl shadow-lg">
                                    <SelectItem value="MALE">Homem</SelectItem>
                                    <SelectItem value="FEMALE">Mulher</SelectItem>
                                </SelectContent>
                            </Select>
                            {getFieldError("genero") && (
                                <p className="text-[10px] text-red-500 font-semibold flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> {getFieldError("genero")}
                                </p>
                            )}
                        </div>

                        {/* BirthDate Field */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700">Data de Nascimento</Label>
                            <Input
                                type="text"
                                placeholder="DD/MM/AAAA"
                                value={correctForm.nascimento}
                                onChange={(e) => setCorrectForm({ ...correctForm, nascimento: e.target.value })}
                                className={`h-10 rounded-xl ${getFieldError("nascimento") ? 'border-red-500 focus-visible:ring-red-500 bg-red-50/10' : ''}`}
                            />
                            {getFieldError("nascimento") && (
                                <p className="text-[10px] text-red-500 font-semibold flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> {getFieldError("nascimento")}
                                </p>
                            )}
                        </div>

                        {/* Contato/Phone Field */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700">Contato (Telefone)</Label>
                            <Input
                                value={correctForm.contato}
                                onChange={(e) => setCorrectForm({ ...correctForm, contato: maskPhone(e.target.value) })}
                                className={`h-10 rounded-xl ${getFieldError("contato") ? 'border-red-500 focus-visible:ring-red-500 bg-red-50/10' : ''}`}
                            />
                            {getFieldError("contato") && (
                                <p className="text-[10px] text-red-500 font-semibold flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> {getFieldError("contato")}
                                </p>
                            )}
                        </div>

                        {/* Data Admissao Field */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700">Data de Admissão</Label>
                            <Input
                                type="text"
                                placeholder="DD/MM/AAAA"
                                value={correctForm.data_admissao}
                                onChange={(e) => setCorrectForm({ ...correctForm, data_admissao: e.target.value })}
                                className={`h-10 rounded-xl ${getFieldError("data_admissao") ? 'border-red-500 focus-visible:ring-red-500 bg-red-50/10' : ''}`}
                            />
                            {getFieldError("data_admissao") && (
                                <p className="text-[10px] text-red-500 font-semibold flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> {getFieldError("data_admissao")}
                                </p>
                            )}
                        </div>

                        {/* CEP Field */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700">CEP</Label>
                            <Input
                                value={correctForm.cep}
                                onChange={(e) => setCorrectForm({ ...correctForm, cep: e.target.value })}
                                className="h-10 rounded-xl"
                            />
                        </div>

                        {/* Address Field */}
                        <div className="space-y-1.5 md:col-span-2">
                            <Label className="text-xs font-bold text-slate-700">Endereço</Label>
                            <Input
                                value={correctForm.address}
                                onChange={(e) => setCorrectForm({ ...correctForm, address: e.target.value })}
                                className="h-10 rounded-xl"
                            />
                        </div>

                        {/* Address details */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700">Número</Label>
                            <Input
                                value={correctForm.number}
                                onChange={(e) => setCorrectForm({ ...correctForm, number: e.target.value })}
                                className="h-10 rounded-xl"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700">Bairro</Label>
                            <Input
                                value={correctForm.district}
                                onChange={(e) => setCorrectForm({ ...correctForm, district: e.target.value })}
                                className="h-10 rounded-xl"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700">Cidade</Label>
                            <Input
                                value={correctForm.city}
                                onChange={(e) => setCorrectForm({ ...correctForm, city: e.target.value })}
                                className="h-10 rounded-xl"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700">Complemento</Label>
                            <Input
                                value={correctForm.complement}
                                onChange={(e) => setCorrectForm({ ...correctForm, complement: e.target.value })}
                                className="h-10 rounded-xl"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 mt-6 sm:justify-end">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsCorrectOpen(false)
                                setCurrentItem(null)
                            }}
                            className="rounded-xl cursor-pointer"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSaveCorrection}
                            disabled={importsStore.processingItem === currentItem?.id}
                            className="text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold cursor-pointer"
                        >
                            {importsStore.processingItem === currentItem?.id ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Criando...
                                </>
                            ) : (
                                "Criar Funcionário"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 3. Delete Single Import Confirmation Dialog */}
            <Dialog open={!!importToDelete} onOpenChange={(open) => !open && setImportToDelete(null)}>
                <DialogContent className="sm:max-w-[450px] rounded-3xl p-6 border-slate-100 bg-white">
                    <DialogHeader>
                        <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-2">
                            <Trash2 className="w-5 h-5" />
                        </div>
                        <DialogTitle className="text-base font-bold text-slate-800">
                            Excluir Importação #{importToDelete?.id}?
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Esta ação removerá o registro do lote <strong className="text-slate-700 font-semibold">{importToDelete?.arquivo}</strong> do histórico. Os funcionários já criados no sistema não serão excluídos.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="gap-2 mt-4 sm:justify-end">
                        <Button
                            variant="outline"
                            onClick={() => setImportToDelete(null)}
                            className="rounded-xl cursor-pointer"
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmDeleteSingle}
                            disabled={deletingId !== null}
                            className="rounded-xl font-bold bg-red-600 hover:bg-red-700 cursor-pointer"
                        >
                            {deletingId !== null ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Excluindo...
                                </>
                            ) : (
                                "Excluir Importação"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 4. Clear Entire History Confirmation Dialog */}
            <Dialog open={isClearHistoryOpen} onOpenChange={setIsClearHistoryOpen}>
                <DialogContent className="sm:max-w-[480px] rounded-3xl p-6 border-slate-100 bg-white">
                    <DialogHeader>
                        <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-2">
                            <AlertOctagon className="w-5 h-5" />
                        </div>
                        <DialogTitle className="text-base font-bold text-slate-800">
                            Limpar Todo o Histórico de Importações?
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Tem certeza que deseja apagar todos os registros de importações desta empresa? Todos os lotes e relatórios de falhas anteriores serão removidos. Os funcionários já cadastrados permanecerão salvos.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="gap-2 mt-4 sm:justify-end">
                        <Button
                            variant="outline"
                            onClick={() => setIsClearHistoryOpen(false)}
                            className="rounded-xl cursor-pointer"
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmClearHistory}
                            disabled={isClearingHistory}
                            className="rounded-xl font-bold bg-red-600 hover:bg-red-700 cursor-pointer"
                        >
                            {isClearingHistory ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Limpando histórico...
                                </>
                            ) : (
                                "Sim, Limpar Histórico"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </main>
    )
}
