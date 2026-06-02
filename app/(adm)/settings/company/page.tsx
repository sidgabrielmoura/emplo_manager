"use client"

import { getDaysRemaining } from "@/lib/utils"

import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCompanyStore } from "@/stores/company"
import { useSnapshot } from "valtio"
import { useEffect, useState } from "react"
import { Building2, Save, Upload, Loader2, ArrowLeft, FileText, CheckCircle2, Clock, AlertCircle, Eye, Download, Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react"
import { useRouter } from "next/navigation"
import { updateCompany, uploadImage, getCompanyDocuments, updateCompanyDocument, getCompanyData, downloadFile, getCompanyRequiredDocumentsAdmin, addCompanyRequiredDocumentAdmin, updateCompanyRequiredDocumentAdmin, deleteCompanyRequiredDocumentAdmin, swapRequiredDocuments } from "@/actions/requests"
import { toast } from "sonner"
import Link from "next/link"
import { Dialog, DialogContent, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useRef } from "react"

const COMPANY_DOCS = [
    { type: 'CNPJ_SOCIAL_CONTRACT', label: 'Contrato Social' },
    { type: 'PGR_COMPANY', label: 'PGR' },
    { type: 'PCMSO_COMPANY', label: 'PCMSO' },
    { type: 'ALVARA_LOCALIZACAO', label: 'Alvará de localização e Funcionamento' },
    { type: 'AET_ERGONOMICA', label: 'AET – Análise Ergonômica' },
    { type: 'LICENCA_AMBIENTAL', label: 'Licença Ambiental ou Dispensa de Licenciamento' },
    { type: 'LTCAT', label: 'LTCAT' },
    { type: 'NR15_INSALUBRIDADE', label: 'NR-15 Laudo de insalubridade' },
    { type: 'NR16_PERICULOSIDADE', label: 'NR-16 Laudo de periculosidade' },
    { type: 'PCA_AUDITIVA', label: 'PCA (Programa de Conservação Auditiva)' },
    { type: 'PPR_RESPIRATORIA', label: 'PPR (Programa de Proteção Respiratória)' },
]

const LABOR_DOCS = [
    { type: 'CRF_FGTS', label: 'CRF - Certificado de regularidade do FGTS' },
    { type: 'GUIA_FGTS_DIGITAL', label: 'Guia do FGTS Digital + Comprovante de pagamento' },
    { type: 'GUIA_DARF_PREVIDENCIARIO', label: 'Guia do DARF Previdenciário + Comprovante de pagamento' },
    { type: 'CND_DIVIDA_ATIVA_UNIAO', label: 'CND Divida ativa da união' },
    { type: 'FOLHA_PAGAMENTO_RESUMO', label: 'Folha de pagamento e Resumo da Folha' },
    { type: 'COMPROVANTE_PAGAMENTO_SALARIO', label: 'Comprovante de pagamento de salário' },
    { type: 'CONVENCAO_COLETIVA', label: 'Convenção coletiva' },
    { type: 'ESPELHO_DE_PONTO', label: 'Espelho de ponto*' },
    { type: 'DECLARACAO_DCTFWEB', label: 'Declaração Completa - DCTFWeb' },
    { type: 'DECLARACAO_ALOCACAO', label: 'Declaração de alocação' },
    { type: 'DECLARACAO_DEMITIDOS_ESOCIAL', label: 'Declaração de demitidos + Relação de Trabalhadores - eSocial' },
    { type: 'DECLARACAO_MENSAL_FERIAS', label: 'Declaração mensal de férias' },
    { type: 'RECIBO_FERIAS_PAGAMENTO', label: 'Recibo de férias e comprovante de pagamento geral' },
    { type: 'CND_DEBITOS_TRABALHISTAS', label: 'CND - Débitos Trabalhistas' },
    { type: 'GUIA_DAS_PAGAMENTO', label: 'Guia do DAS + Comprovante de pagamento' }
]

export default function CompanySettingsPage() {
    const router = useRouter()
    const { company_selected } = useSnapshot(useCompanyStore)
    const [loading, setLoading] = useState(false)
    const [documents, setDocuments] = useState<any[]>([])
    const [docsLoading, setDocsLoading] = useState(true)


    const [uploadLoading, setUploadLoading] = useState(false)
    const [selectedType, setSelectedType] = useState<string | null>(null)
    const [uploadFile, setUploadFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [issuedAt, setIssuedAt] = useState<string>("")
    const [expireAt, setExpireAt] = useState<string>("")
    const [expire, setExpire] = useState<boolean>(false)

    const docInputRef = useRef<HTMLInputElement>(null)
    const dialogCloseRef = useRef<HTMLButtonElement>(null)

    const [form, setForm] = useState({
        name: '', cnpj: '', email: '', phone: '', address: '', state: '', city: '', responsible: '', imageUrl: '', disabledDocuments: [] as string[]
    })

    const [requiredDocs, setRequiredDocs] = useState<any[]>([])
    const [reqDocsLoading, setReqDocsLoading] = useState(true)

    const [isChecklistDialogOpen, setIsChecklistDialogOpen] = useState(false)
    const [editingChecklist, setEditingChecklist] = useState<any | null>(null)
    const [checklistForm, setChecklistForm] = useState({
        name: '',
        target: 'EMPLOYEE_DOC' as 'EMPLOYEE_DOC' | 'EMPLOYEE_TRAINING' | 'COMPANY_DOC' | 'COMPANY_LABOR',
        validityDays: '' as string | number,
        isEnabled: true
    })
    const [checklistLoading, setChecklistLoading] = useState(false)
    const [loadingArrowId, setLoadingArrowId] = useState<string | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

    const handleSaveChecklist = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!checklistForm.name.trim()) {
            toast.error("Por favor, preencha o nome do documento.")
            return
        }
        const companyId = company_selected?.id || localStorage.getItem('company_id')
        if (!companyId) return

        setChecklistLoading(true)
        try {
            if (editingChecklist) {
                await updateCompanyRequiredDocumentAdmin({
                    id: editingChecklist.id,
                    name: checklistForm.name.trim(),
                    target: checklistForm.target,
                    validityDays: checklistForm.validityDays ? Number(checklistForm.validityDays) : undefined,
                    isEnabled: checklistForm.isEnabled
                })
                toast.success("Documento padrão atualizado com sucesso!")
            } else {
                await addCompanyRequiredDocumentAdmin({
                    companyId,
                    name: checklistForm.name.trim(),
                    target: checklistForm.target,
                    validityDays: checklistForm.validityDays ? Number(checklistForm.validityDays) : undefined,
                    isEnabled: checklistForm.isEnabled
                })
                toast.success("Documento padrão criado com sucesso!")
            }

            const data = await getCompanyRequiredDocumentsAdmin(companyId)
            setRequiredDocs(data || [])

            setIsChecklistDialogOpen(false)
            setEditingChecklist(null)
            setChecklistForm({ name: '', target: 'EMPLOYEE_DOC', validityDays: '', isEnabled: true })
        } catch (error: any) {
            toast.error(error?.response?.data?.error || "Erro ao salvar documento padrão")
        } finally {
            setChecklistLoading(false)
        }
    }

    const handleDeleteChecklist = (id: string) => {
        setDeleteTarget(id)
    }

    const handleMoveRequiredDoc = async (items: any[], index: number, direction: "up" | "down") => {
        const otherIndex = direction === "up" ? index - 1 : index + 1
        if (otherIndex < 0 || otherIndex >= items.length) return

        const item1 = items[index]
        const item2 = items[otherIndex]
        const companyId = company_selected?.id || localStorage.getItem('company_id')
        if (!companyId) return

        setLoadingArrowId(item1.id)
        try {
            await swapRequiredDocuments(item1.id, item2.id)
            const data = await getCompanyRequiredDocumentsAdmin(companyId)
            setRequiredDocs(data || [])
            toast.success("Posição atualizada com sucesso")
        } catch (error) {
            toast.error("Erro ao alterar posição")
        } finally {
            setLoadingArrowId(null)
        }
    }



    const handleToggleChecklistStatus = async (item: any, isEnabled: boolean) => {
        const companyId = company_selected?.id || localStorage.getItem('company_id')
        if (!companyId) return

        try {
            await updateCompanyRequiredDocumentAdmin({
                id: item.id,
                isEnabled
            })
            toast.success(isEnabled ? "Documento habilitado!" : "Documento desabilitado!")
            const data = await getCompanyRequiredDocumentsAdmin(companyId)
            setRequiredDocs(data || [])
        } catch (error: any) {
            toast.error(error?.response?.data?.error || "Erro ao atualizar status")
        }
    }

    useEffect(() => {
        const fetchCompanyData = async () => {
            const companyId = localStorage.getItem('company_id')

            if (!company_selected && !companyId) {
                router.push('/dashboard')
                return
            }

            let loadedCompany = company_selected

            try {
                if (!company_selected && companyId) {
                    loadedCompany = await getCompanyData(companyId)
                }

                if (loadedCompany) {
                    setForm({
                        name: loadedCompany.name || '',
                        cnpj: loadedCompany.cnpj || '',
                        email: loadedCompany.email || '',
                        phone: loadedCompany.phone || '',
                        address: loadedCompany.address || '',
                        state: loadedCompany.state || '',
                        city: loadedCompany.city || '',
                        responsible: loadedCompany.responsible || '',
                        imageUrl: loadedCompany.imageUrl || '',
                        disabledDocuments: (loadedCompany as any).disabledDocuments || []
                    })

                    setDocsLoading(true)
                    const updatedDocs = await getCompanyDocuments(loadedCompany.id)
                    setDocuments(updatedDocs)

                    setReqDocsLoading(true)
                    const reqDocs = await getCompanyRequiredDocumentsAdmin(loadedCompany.id)
                    setRequiredDocs(reqDocs || [])
                }
            } catch (error) {
                console.error("Failed to load company data", error)
                router.push('/dashboard')
            } finally {
                setDocsLoading(false)
                setReqDocsLoading(false)
            }
        }

        fetchCompanyData()
    }, [company_selected, router])

    const handleSave = async () => {
        setLoading(true)
        try {
            const companyId = company_selected?.id || localStorage.getItem('company_id')
            await updateCompany({ ...form, companyId })
            toast.success("Dados da empresa atualizados!")
        } catch (error) {
            toast.error("Erro ao atualizar empresa")
        } finally {
            setLoading(false)
        }
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setLoading(true)
            try {
                const uploaded: any = await uploadImage(e.target.files[0])
                setForm(prev => ({ ...prev, imageUrl: uploaded.url }))
                toast.success("Logo atualizada!")
            } catch (error) {
                toast.error("Erro ao subir imagem")
            } finally {
                setLoading(false)
            }
        }
    }

    const handleSelect = (fileList?: FileList | null) => {
        if (!fileList?.[0]) return
        const selected = fileList[0]
        setUploadFile(selected)
        setPreview(URL.createObjectURL(selected))
    }

    const handleUploadDocument = async (virtualId?: string, currentFileUrl?: string | null) => {
        const companyId = company_selected?.id || localStorage.getItem('company_id')
        if (!companyId) return
        if (!selectedType && !virtualId) return

        if (!uploadFile && !currentFileUrl) {
            toast.error("Selecione um arquivo")
            return
        }

        if (!issuedAt) {
            toast.error("Informe a data de emissão")
            return
        }

        if (expire && !expireAt) {
            toast.error("Informe a data de vencimento")
            return
        }

        setUploadLoading(true)
        try {
            let fileUrl = currentFileUrl

            if (uploadFile) {
                const uploaded: any = await uploadImage(uploadFile).catch(() => {
                    toast.error("Erro ao fazer upload do arquivo (pode ser muito grande).")
                    return null
                })

                if (!uploaded) {
                    setUploadLoading(false)
                    return
                }

                fileUrl = uploaded.url
            }

            await updateCompanyDocument({
                id: virtualId,
                companyId: companyId,
                type: selectedType || 'CUSTOM',
                fileUrl: fileUrl,
                issuedAt: issuedAt,
                expiresAt: expire ? expireAt : undefined
            })

            toast.success("Documento atualizado com sucesso!")

            setDocsLoading(true)
            const updatedDocs = await getCompanyDocuments(companyId)
            setDocuments(updatedDocs)

            setUploadFile(null)
            setPreview(null)
            setSelectedType(null)
            setIssuedAt("")
            setExpireAt("")
            setExpire(false)
            dialogCloseRef.current?.click()
        } catch (error) {
            toast.error("Erro ao atualizar dados do documento.")
        } finally {
            setUploadLoading(false)
            setDocsLoading(false)
        }
    }

    const renderDocumentTable = (docList: { type: string, label: string }[], isAdditional?: boolean) => {
        const stats = {
            total: docList.length,
            approved: docList.filter(item => documents.find(d => d.type === item.type)?.status === 'APPROVED').length,
            pending: docList.length - docList.filter(item => documents.find(d => d.type === item.type)?.status === 'APPROVED').length
        }

        return (
            <div className="space-y-6 w-full">
                {!isAdditional && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                        <Card className="rounded-3xl border-slate-100 shadow-sm bg-white p-4 flex items-center gap-4">
                            <div className="p-3 bg-slate-50 rounded-2xl">
                                <FileText className="w-5 h-5 text-slate-400" />
                            </div>
                            <div className="text-center">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total de Itens</p>
                                <p className="text-xl font-black text-slate-700">{stats.total}</p>
                            </div>
                        </Card>
                        <Card className="rounded-3xl border-slate-100 shadow-sm bg-white p-4 flex items-center gap-4">
                            <div className="p-3 bg-emerald-50 rounded-2xl">
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            </div>
                            <div className="text-center">
                                <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Aprovados</p>
                                <p className="text-xl font-black text-emerald-700">{stats.approved}</p>
                            </div>
                        </Card>
                        <Card className="rounded-3xl border-slate-100 shadow-sm bg-white p-4 flex items-center gap-4">
                            <div className="p-3 bg-amber-50 rounded-2xl">
                                <Clock className="w-5 h-5 text-amber-500" />
                            </div>
                            <div className="text-center">
                                <p className="text-xs font-bold text-amber-500 uppercase tracking-wider">Pendentes</p>
                                <p className="text-xl font-black text-amber-700">{stats.pending}</p>
                            </div>
                        </Card>
                    </div>
                )}

                <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden bg-white">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
                        <CardTitle className="text-slate-800 text-xl font-bold flex items-center gap-2">
                            <FileText className="w-5 h-5 text-emerald-600" /> {isAdditional ? "Documentos Adicionais" : "Referência de Documentos"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 px-8">
                        {docsLoading ? (
                            <div className="p-6 space-y-4">
                                <Skeleton className="h-10 w-full rounded-xl" />
                                <Skeleton className="h-10 w-full rounded-xl" />
                                <Skeleton className="h-10 w-full rounded-xl" />
                            </div>
                        ) : (
                            <div className="overflow-x-auto py-4">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Documento</TableHead>
                                            <TableHead className="w-40! text-center">Status</TableHead>
                                            <TableHead className="w-40! text-center">Data de emissão</TableHead>
                                            <TableHead className="w-40! text-center">Vencimento</TableHead>
                                            <TableHead className="text-right">Ação</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {docList.map(({ type, label }) => {
                                            const docData = documents.find(d =>
                                                isAdditional
                                                    ? (d.type === "CUSTOM" && d.name === label)
                                                    : d.type === type
                                            )
                                            return (
                                                <TableRow key={type + label}>
                                                    <TableCell className="font-medium text-slate-700 max-w-[250px] truncate">{label}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant={!docData ? "secondary" : docData.status === "APPROVED" ? "default" : "destructive"}>
                                                            {!docData ? "Pendente" : docData.status === "APPROVED" ? "Aprovado" : "Pendência"}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-center text-slate-500">
                                                        {docData?.issuedAt ? new Date(docData.issuedAt).toLocaleDateString("pt-BR", { timeZone: 'UTC' }) : "—"}
                                                    </TableCell>
                                                    <TableCell className="text-center text-slate-500 font-bold tabular-nums">
                                                        {docData?.expiresAt ? new Date(docData.expiresAt).toLocaleDateString("pt-BR", { timeZone: 'UTC' }) : "—"}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            {docData?.fileUrl && (
                                                                <>
                                                                    <Link href={docData.fileUrl} target="_blank">
                                                                        <Button variant="ghost" size="sm" className="size-8 p-0 cursor-pointer rounded-lg hover:bg-emerald-50 hover:text-emerald-600 text-slate-400">
                                                                            <Eye className="size-4" />
                                                                        </Button>
                                                                    </Link>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="size-8 p-0 cursor-pointer rounded-lg hover:bg-blue-50 hover:text-blue-600 text-slate-400"
                                                                        onClick={() => downloadFile(
                                                                            docData.fileUrl!,
                                                                            `${label}.${docData.fileUrl!.split('.').pop()?.split('?')[0] || 'pdf'}`
                                                                        )}
                                                                    >
                                                                        <Download className="size-4" />
                                                                    </Button>
                                                                </>
                                                            )}

                                                            <Dialog onOpenChange={(open) => {
                                                                if (open) {
                                                                    setUploadFile(null)
                                                                    setPreview(null)
                                                                    setSelectedType(type)
                                                                    setIssuedAt(docData?.issuedAt ? new Date(docData.issuedAt).toISOString().split('T')[0] : "")
                                                                    setExpireAt(docData?.expiresAt ? new Date(docData.expiresAt).toISOString().split('T')[0] : "")
                                                                    setExpire(!!docData?.expiresAt)
                                                                }
                                                            }}>
                                                                <DialogTrigger asChild>
                                                                    {docData?.fileUrl ? (
                                                                        <Button variant="ghost" size="sm" className="size-8 p-0 cursor-pointer rounded-lg hover:bg-amber-50 hover:text-amber-600 text-slate-400">
                                                                            <Pencil className="size-4" />
                                                                        </Button>
                                                                    ) : (
                                                                        <Button size="sm" className="gap-2 cursor-pointer rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold shadow-md shadow-slate-200">
                                                                            <Upload className="w-4 h-4" /> Enviar
                                                                        </Button>
                                                                    )}
                                                                </DialogTrigger>
                                                                <DialogContent className="max-w-2xl! w-full rounded-2xl">
                                                                    <div className="space-y-5">
                                                                        <h3 className="font-bold text-lg text-slate-800">{docData?.fileUrl ? 'Editar' : 'Enviar'}: {label}</h3>

                                                                        {docData?.fileUrl && !uploadFile && (
                                                                            <div className="flex flex-col gap-3 p-4 rounded-xl border border-emerald-100 bg-emerald-50/50">
                                                                                <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                                                                                    <CheckCircle2 className="w-5 h-5" />
                                                                                    Arquivo já se encontra
                                                                                </div>
                                                                                <Button
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    className="w-fit cursor-pointer bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-100 rounded-lg"
                                                                                    onClick={() => docInputRef.current?.click()}
                                                                                >
                                                                                    Trocar arquivo
                                                                                </Button>
                                                                            </div>
                                                                        )}

                                                                        {(!docData?.fileUrl || uploadFile) && (
                                                                            <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-6 bg-slate-50">
                                                                                <input
                                                                                    type="file"
                                                                                    className="hidden"
                                                                                    ref={docInputRef}
                                                                                    onChange={(e) => handleSelect(e.target.files)}
                                                                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                                                                                />
                                                                                {uploadFile ? (
                                                                                    <div className="flex flex-col items-center gap-2 w-full">
                                                                                        <FileText className="w-8 h-8 text-emerald-500" />
                                                                                        <span className="text-sm font-semibold text-slate-700 truncate max-w-full">{uploadFile.name}</span>
                                                                                        <Button variant="link" onClick={() => { setUploadFile(null); setPreview(null); }} className="text-red-500 h-auto p-0 text-xs">Remover arquivo</Button>
                                                                                    </div>
                                                                                ) : (
                                                                                    <Button variant="outline" className="cursor-pointer border-dashed border-2 rounded-xl text-slate-600 font-bold" onClick={() => docInputRef.current?.click()}>
                                                                                        <Upload className="w-4 h-4 mr-2" /> Selecionar Arquivo
                                                                                    </Button>
                                                                                )}
                                                                            </div>
                                                                        )}

                                                                        <section className="space-y-4">
                                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                                <div className="space-y-1.5">
                                                                                    <Label className="text-sm font-bold text-slate-700">Data de emissão</Label>
                                                                                    <Input
                                                                                        type="date"
                                                                                        className="h-11 rounded-xl bg-slate-50/50 border-slate-200"
                                                                                        value={issuedAt}
                                                                                        onChange={(e) => setIssuedAt(e.target.value)}
                                                                                    />
                                                                                </div>

                                                                                <div className="space-y-1.5">
                                                                                    <Label className="text-sm font-bold text-slate-700">Data de vencimento</Label>
                                                                                    <Input
                                                                                        disabled={!expire}
                                                                                        type="date"
                                                                                        className="h-11 rounded-xl bg-slate-50/50 border-slate-200 disabled:opacity-50"
                                                                                        value={expireAt}
                                                                                        onChange={(e) => setExpireAt(e.target.value)}
                                                                                    />
                                                                                </div>
                                                                            </div>

                                                                            <div className="flex items-center gap-3 justify-end pt-2">
                                                                                <p className="text-sm font-medium text-slate-500">Este documento tem validade?</p>
                                                                                <Switch onCheckedChange={(value) => setExpire(value)} checked={expire} className="cursor-pointer" />
                                                                            </div>

                                                                            {docData?.fileUrl && (
                                                                                <div className="flex justify-end pt-2">
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="sm"
                                                                                        className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-2 h-auto py-1 px-2 text-xs font-bold cursor-pointer"
                                                                                        onClick={async () => {
                                                                                            if (confirm("Tem certeza que deseja remover o arquivo deste documento?")) {
                                                                                                const vid = isAdditional ? docData?.id : docData?.id
                                                                                                setUploadLoading(true)
                                                                                                try {
                                                                                                    await updateCompanyDocument({
                                                                                                        id: vid,
                                                                                                        companyId: company_selected?.id || localStorage.getItem('company_id') || '',
                                                                                                        type: type,
                                                                                                        clear: true
                                                                                                    })
                                                                                                    toast.success("Arquivo removido com sucesso!")
                                                                                                    setDocsLoading(true)
                                                                                                    const updatedDocs = await getCompanyDocuments(company_selected?.id || localStorage.getItem('company_id') || '')
                                                                                                    setDocuments(updatedDocs)
                                                                                                    dialogCloseRef.current?.click()
                                                                                                } catch (error) {
                                                                                                    toast.error("Erro ao remover arquivo.")
                                                                                                } finally {
                                                                                                    setUploadLoading(false)
                                                                                                    setDocsLoading(false)
                                                                                                }
                                                                                            }
                                                                                        }}
                                                                                    >
                                                                                        <Trash2 className="size-3" /> Zerar arquivo
                                                                                    </Button>
                                                                                </div>
                                                                            )}
                                                                        </section>

                                                                        <div className="flex gap-2">
                                                                            <Button variant="outline" onClick={() => dialogCloseRef.current?.click()} className="flex-1 py-6! rounded-xl cursor-pointer">
                                                                                Cancelar
                                                                            </Button>
                                                                            <Button
                                                                                onClick={() => {
                                                                                    const vid = isAdditional ? docData?.id : docData?.id
                                                                                    handleUploadDocument(vid, docData?.fileUrl)
                                                                                }}
                                                                                disabled={(!uploadFile && !docData?.fileUrl) || uploadLoading}
                                                                                className="flex-1 py-6! rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                                                                            >
                                                                                {uploadLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                                                                Salvar Alterações
                                                                            </Button>
                                                                        </div>
                                                                        <DialogClose ref={dialogCloseRef} className="hidden" />
                                                                    </div>
                                                                </DialogContent>
                                                            </Dialog>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        )
    }

    const activeCompanyDocs = [
        ...COMPANY_DOCS.filter(d => {
            const req = requiredDocs.find(r => r.name === d.label || r.id === d.type);
            return req ? req.isEnabled !== false : true;
        }),
        ...requiredDocs.filter(r => r.target === 'COMPANY_DOC' && r.isEnabled !== false && !COMPANY_DOCS.some(d => d.label === r.name)).map(r => ({
            type: r.id,
            label: r.name
        }))
    ];

    const activeLaborDocs = [
        ...LABOR_DOCS.filter(d => {
            const req = requiredDocs.find(r => r.name === d.label || r.id === d.type);
            return req ? req.isEnabled !== false : true;
        }),
        ...requiredDocs.filter(r => r.target === 'COMPANY_LABOR' && r.isEnabled !== false && !LABOR_DOCS.some(d => d.label === r.name)).map(r => ({
            type: r.id,
            label: r.name
        }))
    ];

    const renderChecklistManagerTable = (targetType: 'EMPLOYEE_DOC' | 'EMPLOYEE_TRAINING' | 'COMPANY_DOC' | 'COMPANY_LABOR', title: string, description: string) => {
        const items = requiredDocs.filter(r => r.target === targetType)

        return (
            <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden bg-white mt-6">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <CardTitle className="text-slate-800 text-lg font-bold">{title}</CardTitle>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">{description}</p>
                    </div>
                    <Button
                        onClick={() => {
                            setEditingChecklist(null)
                            setChecklistForm({
                                name: '',
                                target: targetType,
                                validityDays: '',
                                isEnabled: true
                            })
                            setIsChecklistDialogOpen(true)
                        }}
                        className="gap-2 cursor-pointer rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                    >
                        + Adicionar Novo
                    </Button>
                </CardHeader>
                <CardContent className="p-6">
                    {reqDocsLoading ? (
                        <div className="space-y-3">
                            <Skeleton className="h-10 w-full rounded-xl" />
                            <Skeleton className="h-10 w-full rounded-xl" />
                        </div>
                    ) : items.length === 0 ? (
                        <p className="text-slate-400 text-sm text-center py-6">Nenhum documento padrão cadastrado para este checklist.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-20 text-center">Ordem</TableHead>
                                    <TableHead>Nome do Documento</TableHead>
                                    <TableHead className="w-40! text-center">Validade (dias)</TableHead>
                                    <TableHead className="w-32! text-center">Habilitado</TableHead>
                                    <TableHead className="w-32! text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item, index) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="w-20 text-center">
                                            <div className="flex items-center gap-1 justify-center">
                                                {loadingArrowId === item.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                                                ) : (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 p-0 cursor-pointer rounded hover:bg-slate-100 disabled:opacity-30"
                                                            disabled={index === 0}
                                                            onClick={() => handleMoveRequiredDoc(items, index, "up")}
                                                        >
                                                            <ArrowUp className="w-4 h-4 text-slate-500" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 p-0 cursor-pointer rounded hover:bg-slate-100 disabled:opacity-30"
                                                            disabled={index === items.length - 1}
                                                            onClick={() => handleMoveRequiredDoc(items, index, "down")}
                                                        >
                                                            <ArrowDown className="w-4 h-4 text-slate-500" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-semibold text-slate-700">{item.name}</TableCell>
                                        <TableCell className="text-center text-slate-500 tabular-nums">
                                            {item.validityDays ? `${item.validityDays} dias` : "Sem expiração"}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Switch
                                                checked={item.isEnabled !== false}
                                                onCheckedChange={(checked) => handleToggleChecklistStatus(item, checked)}
                                                className="cursor-pointer mx-auto"
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="size-8 p-0 cursor-pointer rounded-lg hover:bg-amber-50 hover:text-amber-600 text-slate-400"
                                                    onClick={() => {
                                                        setEditingChecklist(item)
                                                        setChecklistForm({
                                                            name: item.name,
                                                            target: item.target,
                                                            validityDays: item.validityDays || '',
                                                            isEnabled: item.isEnabled !== false
                                                        })
                                                        setIsChecklistDialogOpen(true)
                                                    }}
                                                >
                                                    <Pencil className="size-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="size-8 p-0 cursor-pointer rounded-lg hover:bg-red-50 hover:text-red-600 text-slate-400"
                                                    onClick={() => handleDeleteChecklist(item.id)}
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        )
    }

    if (!form.name && !company_selected) return null

    return (
        <AppLayout>
            <div className="space-y-6 w-full mx-auto">
                <div className="flex items-center gap-4">
                    <Link href="/settings">
                        <Button variant="outline" size="icon" className="cursor-pointer bg-white">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-linear-to-r from-emerald-800 to-emerald-600">
                            Configurações da Empresa
                        </h1>
                        <p className="text-slate-500 font-medium">
                            Gerencie os dados e documentos corporativos
                        </p>
                    </div>
                </div>

                <Tabs defaultValue="details" className="w-full">
                    <TabsList className="bg-white border shadow-sm p-1 rounded-2xl h-auto flex flex-wrap gap-1 sticky top-0 z-10">
                        <TabsTrigger value="details" className="rounded-xl data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 font-bold px-6 py-2.5">
                            Dados Gerais
                        </TabsTrigger>
                        <TabsTrigger value="standard-docs" className="rounded-xl data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 font-bold px-6 py-2.5">
                            Documentos Padrão (Checklists)
                        </TabsTrigger>
                        <TabsTrigger value="company-docs" className="rounded-xl data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 font-bold px-6 py-2.5">
                            Documentos da Empresa
                        </TabsTrigger>
                        <TabsTrigger value="labor-docs" className="rounded-xl data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 font-bold px-6 py-2.5">
                            Documentos Trabalhistas
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="details" className="mt-8">
                        <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden bg-white">
                            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
                                <CardTitle className="flex items-center gap-3 text-slate-800 text-xl font-bold">
                                    <Building2 className="w-6 h-6 text-emerald-600" />
                                    Informações Cadastrais
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2 flex items-center gap-6 mb-4">
                                        <div className="w-24 h-24 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shrink-0 relative group">
                                            {form.imageUrl ? (
                                                <img src={form.imageUrl} alt="Logo" className="w-full h-full object-cover" />
                                            ) : (
                                                <Building2 className="w-8 h-8 text-slate-300" />
                                            )}
                                            <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                                <Upload className="w-6 h-6 text-white" />
                                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                            </label>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-lg">Logomarca</h3>
                                            <p className="text-slate-500 text-sm">Clique na imagem para alterar a logo da sua empresa.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <Label className="font-bold text-slate-700">Razão Social / Nome Fantasia</Label>
                                        <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="rounded-xl h-11 bg-slate-50/50" />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-bold text-slate-700">CNPJ</Label>
                                        <Input value={form.cnpj} onChange={e => setForm({ ...form, cnpj: e.target.value })} className="rounded-xl h-11 bg-slate-50/50" />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-bold text-slate-700">Responsável Legal</Label>
                                        <Input value={form.responsible} onChange={e => setForm({ ...form, responsible: e.target.value })} className="rounded-xl h-11 bg-slate-50/50" />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-bold text-slate-700">E-mail</Label>
                                        <Input value={form.email} onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))} className="rounded-xl h-11 bg-slate-50/50" />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-bold text-slate-700">Telefone</Label>
                                        <Input value={form.phone} onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))} className="rounded-xl h-11 bg-slate-50/50" />
                                    </div>

                                    <div className="space-y-2 md:col-span-2 mt-4 pt-6 border-t border-slate-100">
                                        <Label className="font-bold text-slate-700">Endereço Completo</Label>
                                        <Input value={form.address} onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))} className="rounded-xl h-11 bg-slate-50/50" />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-bold text-slate-700">Cidade</Label>
                                        <Input value={form.city} onChange={e => setForm(prev => ({ ...prev, city: e.target.value }))} className="rounded-xl h-11 bg-slate-50/50" />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-bold text-slate-700">Estado (UF)</Label>
                                        <Input value={form.state} onChange={e => setForm(prev => ({ ...prev, state: e.target.value }))} className="rounded-xl h-11 bg-slate-50/50" />
                                    </div>
                                </div>

                                <div className="mt-8 flex justify-end">
                                    <Button onClick={handleSave} disabled={loading} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 px-8 shadow-lg shadow-emerald-100 cursor-pointer">
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                                        Salvar Alterações
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="standard-docs" className="mt-8 space-y-6">
                        <div className="bg-emerald-50/50 border border-emerald-100 rounded-3xl p-6 mb-2">
                            <h2 className="text-emerald-800 font-bold text-lg mb-1">Checklists e Documentos Padrão</h2>
                            <p className="text-slate-600 text-sm">
                                Configure aqui quais documentos são obrigatórios para a admissão de novos funcionários, para a própria empresa e para obrigações trabalhistas mensais. Novos funcionários começarão somente com os itens habilitados.
                            </p>
                        </div>
                        {renderChecklistManagerTable('EMPLOYEE_DOC', 'Checklist de Admissão (Funcionários)', 'Documentação exigida para novos funcionários')}
                        {renderChecklistManagerTable('EMPLOYEE_TRAINING', 'Treinamentos Padrão (Funcionários)', 'Treinamentos e reciclagens obrigatórios para os funcionários')}
                        {renderChecklistManagerTable('COMPANY_DOC', 'Checklist Corporativo (Empresa)', 'Documentação de segurança e fiscalização da empresa')}
                        {renderChecklistManagerTable('COMPANY_LABOR', 'Checklist Mensal Trabalhista', 'Obrigações trabalhistas e guias de recolhimento')}
                    </TabsContent>

                    <TabsContent value="company-docs" className="mt-8 space-y-8">
                        {renderDocumentTable(activeCompanyDocs)}

                        {documents.filter(d => d.type === 'CUSTOM' && !activeCompanyDocs.some(ac => ac.label === d.name)).length > 0 && (
                            renderDocumentTable(
                                documents
                                    .filter(d => d.type === 'CUSTOM' && !activeCompanyDocs.some(ac => ac.label === d.name))
                                    .map(d => ({ type: 'CUSTOM', label: d.name })),
                                true
                            )
                        )}
                    </TabsContent>

                    <TabsContent value="labor-docs" className="mt-8">
                        {renderDocumentTable(activeLaborDocs)}
                    </TabsContent>
                </Tabs>
            </div>

            <Dialog open={isChecklistDialogOpen} onOpenChange={setIsChecklistDialogOpen}>
                <DialogContent className="max-w-md w-full rounded-2xl bg-white p-6 shadow-xl border">
                    <form onSubmit={handleSaveChecklist} className="space-y-4">
                        <h3 className="font-bold text-lg text-slate-800">
                            {editingChecklist ? "Editar Documento Padrão" : "Adicionar Documento Padrão"}
                        </h3>

                        <div className="space-y-1.5">
                            <Label className="text-sm font-bold text-slate-700">Nome do Documento</Label>
                            <Input
                                placeholder="Ex: CNH, ASO, Certidão de Nascimento..."
                                value={checklistForm.name}
                                onChange={(e) => setChecklistForm({ ...checklistForm, name: e.target.value })}
                                className="h-11 rounded-xl bg-slate-50/50 border-slate-200"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-sm font-bold text-slate-700">Categoria (Alvo)</Label>
                            <select
                                value={checklistForm.target}
                                onChange={(e: any) => setChecklistForm({ ...checklistForm, target: e.target.value })}
                                className="w-full h-11 rounded-xl bg-slate-50/50 border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                <option value="EMPLOYEE_DOC">Funcionário (Checklist de Entrada)</option>
                                <option value="EMPLOYEE_TRAINING">Funcionário (Treinamento Padrão)</option>
                                <option value="COMPANY_DOC">Empresa (Documento Corporativo)</option>
                                <option value="COMPANY_LABOR">Trabalhistas (Obrigações Mensais)</option>
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-sm font-bold text-slate-700">Validade em dias (Opcional)</Label>
                            <Input
                                type="number"
                                placeholder="Ex: 365 (deixe em branco se não expirar)"
                                value={checklistForm.validityDays}
                                onChange={(e) => setChecklistForm({ ...checklistForm, validityDays: e.target.value })}
                                className="h-11 rounded-xl bg-slate-50/50 border-slate-200"
                            />
                        </div>

                        <div className="flex items-center gap-3 justify-between pt-2">
                            <span className="text-sm font-medium text-slate-600">Habilitar para novos cadastros?</span>
                            <Switch
                                checked={checklistForm.isEnabled}
                                onCheckedChange={(checked) => setChecklistForm({ ...checklistForm, isEnabled: checked })}
                                className="cursor-pointer"
                            />
                        </div>

                        <div className="flex gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsChecklistDialogOpen(false)} className="flex-1 py-5 rounded-xl cursor-pointer">
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={checklistLoading}
                                className="flex-1 py-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                            >
                                {checklistLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                Salvar
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
                <DialogContent className="max-w-md w-full rounded-2xl bg-white p-6 shadow-xl border">
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="p-3 bg-red-50 text-red-600 rounded-full">
                            <AlertCircle className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Confirmar Exclusão</h3>
                            <p className="text-sm text-slate-500 mt-2">
                                Tem certeza que deseja excluir este documento padrão? Isso removerá o controle dele para todos os funcionários e empresa. Esta ação não poderá ser desfeita.
                            </p>
                        </div>
                        <div className="flex gap-3 w-full pt-2">
                            <Button
                                variant="outline"
                                className="w-full rounded-xl cursor-pointer flex-1"
                                disabled={loading}
                                onClick={() => setDeleteTarget(null)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                variant="destructive"
                                className="w-full rounded-xl cursor-pointer flex-1 flex items-center justify-center gap-2"
                                disabled={loading}
                                onClick={async () => {
                                    if (!deleteTarget) return
                                    const companyId = company_selected?.id || localStorage.getItem('company_id')
                                    if (!companyId) return
                                    setLoading(true)
                                    try {
                                        await deleteCompanyRequiredDocumentAdmin(deleteTarget)
                                        toast.success("Documento padrão excluído com sucesso!")
                                        const data = await getCompanyRequiredDocumentsAdmin(companyId)
                                        setRequiredDocs(data || [])
                                        setDeleteTarget(null)
                                    } catch (error: any) {
                                        toast.error(error?.response?.data?.error || "Erro ao excluir documento padrão")
                                    } finally {
                                        setLoading(false)
                                    }
                                }}
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                Excluir
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </AppLayout>
    )
}
