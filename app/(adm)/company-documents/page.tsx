"use client"

import { getDaysRemaining } from "@/lib/utils"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCompanyStore } from "@/stores/company"
import { useUserStore } from "@/stores/user"
import { useSnapshot } from "valtio"
import { useEffect, useState, useRef } from "react"
import { FileText, CheckCircle2, Clock, Upload, Loader2, Eye, Download, Pencil, Trash2, Save, Building2, AlertTriangle, Ban, Search, X, Filter } from "lucide-react"
import { useRouter } from "next/navigation"
import { getCompanyDocuments, updateCompanyDocument, getCompanyData, downloadFile, getCompanyRequiredDocumentsAdmin, uploadImage, toggleCompanyDocStatus, deleteCompanyDoc } from "@/actions/requests"
import { toast } from "sonner"
import Link from "next/link"
import { Dialog, DialogContent, DialogTrigger, DialogClose, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { SpyPageGuard } from "@/components/spy-page-guard"

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

export default function CompanyDocumentsPage() {
  const router = useRouter()
  const { company_selected } = useSnapshot(useCompanyStore)
  const user = useSnapshot(useUserStore).user

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

  const [requiredDocs, setRequiredDocs] = useState<any[]>([])
  const [reqDocsLoading, setReqDocsLoading] = useState(true)

  const [disabledDocs, setDisabledDocs] = useState<string[]>([])
  const [togglingDocType, setTogglingDocType] = useState<string | null>(null)
  const [deletingDoc, setDeletingDoc] = useState<any | null>(null)
  const [deleteDocLoading, setDeleteDocLoading] = useState(false)
  const [deleteDocDialogOpen, setDeleteDocDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [quickFilter, setQuickFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "EXPIRED" | "IN_REVIEW" | "DISABLED">("ALL")

  const hasEditPermission = () => {
    if ((user?.role as string) === "ESPIAO") {
      const perms = (user as any).permissions as Record<string, { view: boolean; edit: boolean }>
      return perms["company-documents"]?.edit === true
    }
    return true
  }

  const verifyAction = () => {
    if (!hasEditPermission()) {
      toast.warning("Seu perfil possui acesso somente para visualização.")
      return false
    }
    return true
  }

  useEffect(() => {
    const fetchCompanyData = async () => {
      const companyId = localStorage.getItem('company_id')
      const targetCompanyId = company_selected?.id || companyId

      if (!targetCompanyId) {
        router.push('/dashboard')
        return
      }

      try {
        setDocsLoading(true)
        setReqDocsLoading(true)

        const [fullCompany, updatedDocs, reqDocs] = await Promise.all([
          getCompanyData(targetCompanyId),
          getCompanyDocuments(targetCompanyId),
          getCompanyRequiredDocumentsAdmin(targetCompanyId)
        ])

        if (fullCompany?.disabledDocuments) {
          setDisabledDocs(fullCompany.disabledDocuments)
        }
        setDocuments(updatedDocs || [])
        setRequiredDocs(reqDocs || [])
      } catch (error) {
        console.error("Failed to load company documents", error)
        router.push('/dashboard')
      } finally {
        setDocsLoading(false)
        setReqDocsLoading(false)
      }
    }

    fetchCompanyData()
  }, [company_selected, router])


  const handleSelect = (fileList?: FileList | null) => {
    if (!verifyAction()) return
    if (!fileList?.[0]) return
    const selected = fileList[0]
    setUploadFile(selected)
    setPreview(URL.createObjectURL(selected))
  }

  const handleUploadDocument = async (virtualId?: string, currentFileUrl?: string | null) => {
    if (!verifyAction()) return

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
        const uploaded: any = await uploadImage(uploadFile, "company-documents").catch((err) => {
          toast.error(err?.message || "Erro ao fazer upload do arquivo.")
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

  const handleToggleDocStatus = async (type: string, currentEnabled: boolean, label?: string, isCustom?: boolean) => {
    if (!verifyAction()) return
    const companyId = company_selected?.id || localStorage.getItem('company_id')
    if (!companyId) return

    const newEnabled = !currentEnabled
    setTogglingDocType(type)
    try {
      await toggleCompanyDocStatus({
        companyId,
        type,
        name: label,
        isEnabled: newEnabled,
        isCustom: !!isCustom
      })
      toast.success(newEnabled ? `Documento "${label || type}" habilitado` : `Documento "${label || type}" desabilitado`)

      setDisabledDocs(prev => {
        if (newEnabled) {
          return prev.filter(t => t !== type && t !== label)
        } else {
          return [...prev.filter(t => t !== type && t !== label), type]
        }
      })

      setRequiredDocs(prev => prev.map(r => {
        if (r.id === type || r.name === label) {
          return { ...r, isEnabled: newEnabled }
        }
        return r
      }))

      const updatedDocs = await getCompanyDocuments(companyId)
      setDocuments(updatedDocs || [])
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Erro ao atualizar status do documento")
    } finally {
      setTogglingDocType(null)
    }
  }

  const handleDeleteDocConfirm = async (deleteFileOnly = false, disableAfter = false) => {
    if (!verifyAction()) return
    if (!deletingDoc) return
    const companyId = company_selected?.id || localStorage.getItem('company_id')
    if (!companyId) return

    setDeleteDocLoading(true)
    try {
      await deleteCompanyDoc({
        companyId,
        documentId: deletingDoc.docData?.id,
        type: deletingDoc.type,
        name: deletingDoc.label,
        isCustom: deletingDoc.isCustom,
        deleteFileOnly,
        disableAfterDelete: disableAfter
      })
      toast.success(deleteFileOnly ? "Arquivo excluído com sucesso!" : "Documento excluído com sucesso!")
      setDeleteDocDialogOpen(false)
      setDeletingDoc(null)

      if (disableAfter && deletingDoc.type) {
        setDisabledDocs(prev => [...prev.filter(t => t !== deletingDoc.type && t !== deletingDoc.label), deletingDoc.type])
      }

      const [updatedDocs, reqDocs] = await Promise.all([
        getCompanyDocuments(companyId),
        getCompanyRequiredDocumentsAdmin(companyId)
      ])
      setDocuments(updatedDocs || [])
      setRequiredDocs(reqDocs || [])
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Erro ao excluir documento/arquivo")
    } finally {
      setDeleteDocLoading(false)
    }
  }

  const getDocStatusBadge = (docData: any, isEnabled: boolean, isMobile = false) => {
    const textClass = isMobile ? "text-[9px] rounded-lg shrink-0 font-bold" : "text-[11px] font-bold"

    if (!isEnabled) {
      return (
        <Badge variant="outline" className={`bg-slate-100 text-slate-500 border-slate-200 ${textClass}`}>
          Desabilitado
        </Badge>
      )
    }

    if (!docData?.fileUrl) {
      return (
        <Badge variant="secondary" className={`bg-slate-100 text-slate-600 border-slate-200 ${textClass}`}>
          Não enviado
        </Badge>
      )
    }

    const isExpired = docData.status === "EXPIRED" || (
      docData.expiresAt ? new Date(docData.expiresAt).getTime() < new Date().setUTCHours(0, 0, 0, 0) : false
    )

    if (isExpired) {
      return (
        <Badge variant="destructive" className={`bg-red-500 hover:bg-red-600 text-white shadow-xs ${textClass}`}>
          Vencido
        </Badge>
      )
    }

    if (docData.status === "REJECTED") {
      return (
        <Badge variant="destructive" className={`bg-red-100 text-red-700 border-red-200 ${textClass}`}>
          Reprovado
        </Badge>
      )
    }

    if (docData.status === "APPROVED") {
      return (
        <Badge variant="default" className={`bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs ${textClass}`}>
          Aprovado
        </Badge>
      )
    }

    return (
      <Badge variant="outline" className={`bg-amber-50 text-amber-700 border-amber-200 ${textClass}`}>
        Em análise
      </Badge>
    )
  }

  const renderDocumentTable = (docList: { type: string, label: string, isEnabled?: boolean, isCustom?: boolean }[], isAdditional?: boolean) => {
    // Classificação completa dos documentos
    const docsWithStatus = docList.map(item => {
      const isCustom = item.isCustom || item.type === 'CUSTOM' || (!COMPANY_DOCS.some(d => d.type === item.type) && !LABOR_DOCS.some(d => d.type === item.type))
      const docData = documents.find(d =>
        isCustom
          ? (d.type === "CUSTOM" && d.name === item.label)
          : d.type === item.type
      )
      const active = item.isEnabled !== false
      const hasFile = !!docData?.fileUrl
      const isExpired = docData?.status === "EXPIRED" || (
        docData?.expiresAt ? new Date(docData.expiresAt).getTime() < new Date().setUTCHours(0, 0, 0, 0) : false
      )
      const isApproved = hasFile && docData.status === "APPROVED" && !isExpired
      const isRejected = hasFile && docData.status === "REJECTED"
      const isInReview = hasFile && docData.status === "PENDING" && !isExpired

      let statusKey: "DISABLED" | "PENDING" | "APPROVED" | "EXPIRED" | "IN_REVIEW" | "REJECTED" = "PENDING"
      if (!active) {
        statusKey = "DISABLED"
      } else if (isApproved) {
        statusKey = "APPROVED"
      } else if (isExpired) {
        statusKey = "EXPIRED"
      } else if (isRejected) {
        statusKey = "REJECTED"
      } else if (isInReview) {
        statusKey = "IN_REVIEW"
      } else {
        statusKey = "PENDING"
      }

      return {
        ...item,
        isCustom,
        docData,
        active,
        hasFile,
        isExpired,
        isApproved,
        isRejected,
        isInReview,
        statusKey
      }
    })

    const enabledDocs = docsWithStatus.filter(item => item.active)
    const approvedDocs = docsWithStatus.filter(item => item.isApproved)
    const expiredDocs = docsWithStatus.filter(item => item.active && item.isExpired)
    const inReviewDocs = docsWithStatus.filter(item => item.active && item.isInReview)
    const pendingDocs = docsWithStatus.filter(item => item.active && !item.isApproved)
    const disabledCount = docsWithStatus.filter(item => !item.active).length

    const stats = {
      total: enabledDocs.length,
      approved: approvedDocs.length,
      pending: pendingDocs.length,
      expired: expiredDocs.length,
      inReview: inReviewDocs.length,
      disabled: disabledCount
    }

    const filteredDocs = docsWithStatus.filter(item => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matches = item.label.toLowerCase().includes(q)
        if (!matches) return false
      }

      if (quickFilter === "ALL") return true
      if (quickFilter === "APPROVED") return item.isApproved
      if (quickFilter === "PENDING") return item.active && !item.isApproved
      if (quickFilter === "EXPIRED") return item.active && item.isExpired
      if (quickFilter === "IN_REVIEW") return item.active && item.isInReview
      if (quickFilter === "DISABLED") return !item.active

      return true
    })

    return (
      <div className="space-y-4 md:space-y-6 w-full">
        {!isAdditional && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 mb-2">
            <Card
              onClick={() => setQuickFilter(quickFilter === "ALL" ? "ALL" : "ALL")}
              className={`rounded-2xl md:rounded-3xl border-slate-100 shadow-sm bg-white p-3 md:p-4 flex flex-col sm:flex-row items-center sm:items-start gap-2 md:gap-4 cursor-pointer hover:border-slate-300 hover:shadow-md transition-all ${
                quickFilter === "ALL" ? "ring-2 ring-slate-400 bg-slate-50/40" : ""
              }`}
            >
              <div className="p-2 md:p-3 bg-slate-50 rounded-xl md:rounded-2xl shrink-0">
                <FileText className="w-4 h-4 md:w-5 md:h-5 text-slate-400" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-[9px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Obrigatórios</p>
                <p className="text-sm md:text-xl font-black text-slate-700 leading-none mt-0.5 md:mt-1">{stats.total}</p>
              </div>
            </Card>

            <Card
              onClick={() => setQuickFilter(quickFilter === "APPROVED" ? "ALL" : "APPROVED")}
              className={`rounded-2xl md:rounded-3xl border-slate-100 shadow-sm bg-white p-3 md:p-4 flex flex-col sm:flex-row items-center sm:items-start gap-2 md:gap-4 cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all ${
                quickFilter === "APPROVED" ? "ring-2 ring-emerald-500 bg-emerald-50/20" : ""
              }`}
            >
              <div className="p-2 md:p-3 bg-emerald-50 rounded-xl md:rounded-2xl shrink-0">
                <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-emerald-500" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-[9px] md:text-xs font-bold text-emerald-500 uppercase tracking-wider">Aprovados</p>
                <p className="text-sm md:text-xl font-black text-emerald-700 leading-none mt-0.5 md:mt-1">{stats.approved}</p>
              </div>
            </Card>

            <Card
              onClick={() => setQuickFilter(quickFilter === "PENDING" ? "ALL" : "PENDING")}
              className={`rounded-2xl md:rounded-3xl border-slate-100 shadow-sm bg-white p-3 md:p-4 flex flex-col sm:flex-row items-center sm:items-start gap-2 md:gap-4 cursor-pointer hover:border-amber-300 hover:shadow-md transition-all ${
                quickFilter === "PENDING" ? "ring-2 ring-amber-500 bg-amber-50/20" : ""
              }`}
            >
              <div className="p-2 md:p-3 bg-amber-50 rounded-xl md:rounded-2xl shrink-0">
                <Clock className="w-4 h-4 md:w-5 md:h-5 text-amber-500" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-[9px] md:text-xs font-bold text-amber-500 uppercase tracking-wider">Pendentes</p>
                <p className="text-sm md:text-xl font-black text-amber-700 leading-none mt-0.5 md:mt-1">{stats.pending}</p>
              </div>
            </Card>

            <Card
              onClick={() => setQuickFilter(quickFilter === "DISABLED" ? "ALL" : "DISABLED")}
              className={`rounded-2xl md:rounded-3xl border-slate-100 shadow-sm bg-white p-3 md:p-4 flex flex-col sm:flex-row items-center sm:items-start gap-2 md:gap-4 cursor-pointer hover:border-slate-300 hover:shadow-md transition-all ${
                quickFilter === "DISABLED" ? "ring-2 ring-slate-500 bg-slate-50/50" : ""
              }`}
            >
              <div className="p-2 md:p-3 bg-slate-100 rounded-xl md:rounded-2xl shrink-0">
                <Ban className="w-4 h-4 md:w-5 md:h-5 text-slate-500" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-[9px] md:text-xs font-bold text-slate-500 uppercase tracking-wider">Desabilitados</p>
                <p className="text-sm md:text-xl font-black text-slate-600 leading-none mt-0.5 md:mt-1">{stats.disabled}</p>
              </div>
            </Card>
          </div>
        )}

        <Card className="rounded-3xl p-0! md:rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-4 sm:p-6 md:p-7 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-slate-800 text-base md:text-xl font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600 animate-pulse" /> {isAdditional ? "Documentos Adicionais" : "Referência de Documentos"}
              </CardTitle>

              {/* Barra de busca rápida */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar documento..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-8 h-9 text-xs rounded-xl bg-white border-slate-200 focus-visible:ring-emerald-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Pílulas de Filtros Rápidos */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Filtros:
              </span>

              <button
                type="button"
                onClick={() => setQuickFilter("ALL")}
                className={`px-2.5 py-1 rounded-xl font-bold text-[11px] transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border ${
                  quickFilter === "ALL"
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                Todos
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                  quickFilter === "ALL" ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-500"
                }`}>
                  {docList.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setQuickFilter(quickFilter === "PENDING" ? "ALL" : "PENDING")}
                className={`px-2.5 py-1 rounded-xl font-bold text-[11px] transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border ${
                  quickFilter === "PENDING"
                    ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                    : "bg-white text-amber-700 border-amber-200 hover:bg-amber-50"
                }`}
              >
                <Clock className="w-3 h-3" />
                Pendentes
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                  quickFilter === "PENDING" ? "bg-amber-700 text-white" : "bg-amber-100 text-amber-800"
                }`}>
                  {stats.pending}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setQuickFilter(quickFilter === "APPROVED" ? "ALL" : "APPROVED")}
                className={`px-2.5 py-1 rounded-xl font-bold text-[11px] transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border ${
                  quickFilter === "APPROVED"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                Aprovados
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                  quickFilter === "APPROVED" ? "bg-emerald-700 text-white" : "bg-emerald-100 text-emerald-800"
                }`}>
                  {stats.approved}
                </span>
              </button>

              {stats.expired > 0 && (
                <button
                  type="button"
                  onClick={() => setQuickFilter(quickFilter === "EXPIRED" ? "ALL" : "EXPIRED")}
                  className={`px-2.5 py-1 rounded-xl font-bold text-[11px] transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border ${
                    quickFilter === "EXPIRED"
                      ? "bg-red-600 text-white border-red-600 shadow-xs"
                      : "bg-white text-red-700 border-red-200 hover:bg-red-50"
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  Vencidos
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                    quickFilter === "EXPIRED" ? "bg-red-700 text-white" : "bg-red-100 text-red-800"
                  }`}>
                    {stats.expired}
                  </span>
                </button>
              )}

              {stats.inReview > 0 && (
                <button
                  type="button"
                  onClick={() => setQuickFilter(quickFilter === "IN_REVIEW" ? "ALL" : "IN_REVIEW")}
                  className={`px-2.5 py-1 rounded-xl font-bold text-[11px] transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border ${
                    quickFilter === "IN_REVIEW"
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-white text-blue-700 border-blue-200 hover:bg-blue-50"
                  }`}
                >
                  <FileText className="w-3 h-3" />
                  Em análise
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                    quickFilter === "IN_REVIEW" ? "bg-blue-700 text-white" : "bg-blue-100 text-blue-800"
                  }`}>
                    {stats.inReview}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setQuickFilter(quickFilter === "DISABLED" ? "ALL" : "DISABLED")}
                className={`px-2.5 py-1 rounded-xl font-bold text-[11px] transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border ${
                  quickFilter === "DISABLED"
                    ? "bg-slate-700 text-white border-slate-700 shadow-xs"
                    : "bg-white text-slate-500 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Ban className="w-3 h-3" />
                Desabilitados
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                  quickFilter === "DISABLED" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600"
                }`}>
                  {stats.disabled}
                </span>
              </button>

              {(quickFilter !== "ALL" || searchQuery) && (
                <button
                  type="button"
                  onClick={() => { setQuickFilter("ALL"); setSearchQuery(""); }}
                  className="text-[11px] font-bold text-slate-400 hover:text-slate-700 underline underline-offset-2 ml-auto shrink-0 cursor-pointer"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0 px-4 sm:px-6 md:px-8">
            {docsLoading ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto py-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Documento</TableHead>
                        <TableHead className="w-36! text-center">Status</TableHead>
                        <TableHead className="w-32! text-center">Obrigatório</TableHead>
                        <TableHead className="w-36! text-center">Data de emissão</TableHead>
                        <TableHead className="w-36! text-center">Vencimento</TableHead>
                        <TableHead className="text-right">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDocs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <FileText className="w-8 h-8 text-slate-300" />
                              <p className="text-sm font-semibold text-slate-600">Nenhum documento encontrado</p>
                              <p className="text-xs text-slate-400">Tente ajustar o termo de busca ou o filtro de status selecionado.</p>
                              {(searchQuery || quickFilter !== "ALL") && (
                                <Button variant="outline" size="sm" onClick={() => { setSearchQuery(""); setQuickFilter("ALL"); }} className="mt-2 rounded-xl text-xs cursor-pointer">
                                  Limpar filtros
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredDocs.map(({ type, label, isEnabled, isCustom, docData, active }) => {
                          return (
                          <TableRow key={type + label} className={active ? "hover:bg-slate-50/50 transition-colors" : "opacity-60 bg-slate-50/40 hover:opacity-90 hover:bg-slate-50 transition-all"}>
                            <TableCell className="font-medium text-slate-700 max-w-[240px]">
                              <div className="flex items-center gap-2">
                                <span className={`truncate ${!active ? "line-through text-slate-400" : ""}`} title={label}>{label}</span>
                                {isCustom && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-medium shrink-0">Adicional</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {getDocStatusBadge(docData, active)}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <Switch
                                  checked={active}
                                  disabled={togglingDocType === type}
                                  onCheckedChange={() => handleToggleDocStatus(type, active, label, isCustom)}
                                  className="cursor-pointer scale-90"
                                />
                                <span className="text-[10px] font-bold text-slate-400 select-none w-14 text-left">
                                  {active ? "Ativo" : "Inativo"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center text-slate-500 text-xs">
                              {docData?.issuedAt ? new Date(docData.issuedAt).toLocaleDateString("pt-BR", { timeZone: 'UTC' }) : "—"}
                            </TableCell>
                            <TableCell className="text-center text-slate-500 font-bold tabular-nums text-xs">
                              {docData?.expiresAt ? new Date(docData.expiresAt).toLocaleDateString("pt-BR", { timeZone: 'UTC' }) : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {docData?.fileUrl && (
                                  <>
                                    <Link href={docData.fileUrl} target="_blank">
                                      <Button variant="ghost" size="sm" className="size-8 p-0 cursor-pointer rounded-lg hover:bg-emerald-50 hover:text-emerald-600 text-slate-400" title="Visualizar">
                                        <Eye className="size-4" />
                                      </Button>
                                    </Link>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="size-8 p-0 cursor-pointer rounded-lg hover:bg-blue-50 hover:text-blue-600 text-slate-400"
                                      title="Baixar"
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
                                    if (!verifyAction()) return
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
                                      <Button variant="ghost" size="sm" className="size-8 p-0 cursor-pointer rounded-lg hover:bg-amber-50 hover:text-amber-600 text-slate-400" title="Editar">
                                        <Pencil className="size-4" />
                                      </Button>
                                    ) : (
                                      <Button size="sm" className="gap-2 cursor-pointer rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold shadow-md shadow-slate-200">
                                        <Upload className="w-4 h-4" /> Enviar
                                      </Button>
                                    )}
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl! w-[calc(100%-2rem)] md:w-full rounded-3xl bg-white p-5 md:p-6 shadow-xl border overflow-y-auto max-h-[90vh] mx-auto">
                                    <div className="space-y-5">
                                      <h3 className="font-bold text-base md:text-lg text-slate-800">{docData?.fileUrl ? 'Editar' : 'Enviar'}: {label}</h3>

                                      {docData?.fileUrl && !uploadFile && (
                                        <div className="flex flex-col gap-3 p-4 rounded-xl border border-emerald-100 bg-emerald-50/50">
                                          <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                                            <CheckCircle2 className="w-5 h-5" />
                                            Arquivo já se encontra enviado
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
                                      </section>

                                      <div className="flex gap-2">
                                        <Button variant="outline" onClick={() => dialogCloseRef.current?.click()} className="flex-1 py-6! rounded-xl cursor-pointer">
                                          Cancelar
                                        </Button>
                                        <Button
                                          onClick={() => {
                                            const vid = docData?.id
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

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (!verifyAction()) return
                                    setDeletingDoc({
                                      docData,
                                      type,
                                      label,
                                      isCustom,
                                      hasFile: !!docData?.fileUrl,
                                      isEnabled: active
                                    })
                                    setDeleteDocDialogOpen(true)
                                  }}
                                  className="size-8 p-0 cursor-pointer rounded-lg hover:bg-red-50 hover:text-red-600 text-slate-400"
                                  title={docData?.fileUrl ? "Excluir arquivo" : isCustom ? "Excluir documento" : "Desabilitar documento"}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile View Cards */}
                <div className="block md:hidden space-y-3 py-4">
                  {filteredDocs.length === 0 ? (
                    <div className="text-center py-12 flex flex-col items-center justify-center gap-2 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-6">
                      <FileText className="w-8 h-8 text-slate-300" />
                      <p className="text-sm font-semibold text-slate-600">Nenhum documento encontrado</p>
                      <p className="text-xs text-slate-400">Tente ajustar o termo de busca ou o filtro de status selecionado.</p>
                      {(searchQuery || quickFilter !== "ALL") && (
                        <Button variant="outline" size="sm" onClick={() => { setSearchQuery(""); setQuickFilter("ALL"); }} className="mt-2 rounded-xl text-xs cursor-pointer">
                          Limpar filtros
                        </Button>
                      )}
                    </div>
                  ) : filteredDocs.map(({ type, label, isEnabled, isCustom, docData, active }) => {
                      return (
                      <div key={type + label} className={`border rounded-2xl p-4 space-y-3.5 transition-all ${active ? "bg-slate-50/50 border-slate-100 hover:bg-slate-50/80" : "bg-slate-50/30 border-slate-200/50 opacity-60 hover:opacity-90"}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className={`text-xs font-bold leading-snug break-words ${active ? "text-slate-800" : "line-through text-slate-400"}`}>
                              {label}
                            </h4>
                            {isCustom && (
                              <span className="text-[9px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded font-medium mt-1 inline-block">Adicional</span>
                            )}
                          </div>
                          {getDocStatusBadge(docData, active, true)}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-white/50 p-2.5 rounded-xl border border-slate-100/50">
                          <div>
                            <span className="block text-slate-300 font-semibold mb-0.5 text-[8px]">Emissão</span>
                            <span className="text-slate-500 tabular-nums">{docData?.issuedAt ? new Date(docData.issuedAt).toLocaleDateString("pt-BR", { timeZone: 'UTC' }) : "—"}</span>
                          </div>
                          <div>
                            <span className="block text-slate-300 font-semibold mb-0.5 text-[8px]">Vencimento</span>
                            <span className="text-slate-600 font-black tabular-nums">{docData?.expiresAt ? new Date(docData.expiresAt).toLocaleDateString("pt-BR", { timeZone: 'UTC' }) : "—"}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={active}
                              disabled={togglingDocType === type}
                              onCheckedChange={() => handleToggleDocStatus(type, active, label, isCustom)}
                              className="cursor-pointer scale-90"
                            />
                            <span className="text-[10px] font-bold text-slate-400">
                              {active ? "Ativo" : "Inativo"}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
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
                                if (!verifyAction()) return
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
                                  <Button size="sm" className="gap-2 h-8 px-3.5 cursor-pointer rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-[10px] font-bold shadow-md shadow-slate-200">
                                    <Upload className="w-3.5 h-3.5" /> Enviar
                                  </Button>
                                )}
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl! w-[calc(100%-2rem)] md:w-full rounded-3xl bg-white p-5 md:p-6 shadow-xl border overflow-y-auto max-h-[90vh] mx-auto">
                                <div className="space-y-5">
                                  <h3 className="font-bold text-base md:text-lg text-slate-800">{docData?.fileUrl ? 'Editar' : 'Enviar'}: {label}</h3>

                                  {docData?.fileUrl && !uploadFile && (
                                    <div className="flex flex-col gap-3 p-4 rounded-xl border border-emerald-100 bg-emerald-50/50">
                                      <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                                        <CheckCircle2 className="w-5 h-5" />
                                        Arquivo já se encontra enviado
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
                                  </section>

                                  <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => dialogCloseRef.current?.click()} className="flex-1 py-6! rounded-xl cursor-pointer">
                                      Cancelar
                                    </Button>
                                    <Button
                                      onClick={() => {
                                        const vid = docData?.id
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

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (!verifyAction()) return
                                setDeletingDoc({
                                  docData,
                                  type,
                                  label,
                                  isCustom,
                                  hasFile: !!docData?.fileUrl,
                                  isEnabled: active
                                })
                                setDeleteDocDialogOpen(true)
                              }}
                              className="size-8 p-0 cursor-pointer rounded-lg hover:bg-red-50 hover:text-red-600 text-slate-400"
                              title={docData?.fileUrl ? "Excluir arquivo" : isCustom ? "Excluir documento" : "Desabilitar documento"}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Lista unificada e ordenada de Documentos Corporativos
  const isDocEnabled = (item: { type: string, label: string, isCustom?: boolean }) => {
    if (disabledDocs.includes(item.type) || (item.label && disabledDocs.includes(item.label))) {
      return false
    }
    const req = requiredDocs.find(r => r.id === item.type || r.name === item.label)
    if (req && req.isEnabled === false) {
      return false
    }
    return true
  }

  const allCompanyDocs = [
    ...COMPANY_DOCS.map(d => ({
      type: d.type,
      label: d.label,
      isCustom: false,
      isEnabled: isDocEnabled({ type: d.type, label: d.label })
    })),
    ...requiredDocs
      .filter(r => r.target === 'COMPANY_DOC' && !COMPANY_DOCS.some(d => d.label === r.name || d.type === r.id))
      .map(r => ({
        type: r.id,
        label: r.name,
        isCustom: true,
        isEnabled: isDocEnabled({ type: r.id, label: r.name, isCustom: true })
      })),
    ...documents
      .filter(d => d.type === 'CUSTOM' && !COMPANY_DOCS.some(cd => cd.label === d.name) && !requiredDocs.some(r => r.name === d.name))
      .map(d => ({
        type: 'CUSTOM',
        label: d.name,
        isCustom: true,
        isEnabled: isDocEnabled({ type: 'CUSTOM', label: d.name, isCustom: true })
      }))
  ]

  // Ordenação: habilitados primeiro, desabilitados por último
  const sortedCompanyDocs = [...allCompanyDocs].sort((a, b) => {
    if (a.isEnabled === b.isEnabled) return 0
    return a.isEnabled ? -1 : 1
  })

  // Lista unificada e ordenada de Obrigações Trabalhistas
  const allLaborDocs = [
    ...LABOR_DOCS.map(d => ({
      type: d.type,
      label: d.label,
      isCustom: false,
      isEnabled: isDocEnabled({ type: d.type, label: d.label })
    })),
    ...requiredDocs
      .filter(r => r.target === 'COMPANY_LABOR' && !LABOR_DOCS.some(d => d.label === r.name || d.type === r.id))
      .map(r => ({
        type: r.id,
        label: r.name,
        isCustom: true,
        isEnabled: isDocEnabled({ type: r.id, label: r.name, isCustom: true })
      }))
  ]

  // Ordenação: habilitados primeiro, desabilitados por último
  const sortedLaborDocs = [...allLaborDocs].sort((a, b) => {
    if (a.isEnabled === b.isEnabled) return 0
    return a.isEnabled ? -1 : 1
  })

  return (
    <AppLayout>
      <SpyPageGuard page="company-documents" action="view">
        <div className="w-full max-w-7xl mx-auto md:p-8 space-y-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Building2 className="w-7 h-7 text-emerald-600" />
              Documentos da Empresa
            </h1>
            <p className="text-sm text-slate-500">
              Gerencie e visualize a documentação corporativa e obrigações trabalhistas da empresa.
            </p>
          </div>

          <Tabs defaultValue="company-docs" className="w-full">
            <TabsList className="bg-slate-100 p-1 rounded-2xl w-fit flex gap-1 mb-6">
              <TabsTrigger value="company-docs" className="rounded-xl px-2 py-2.5 text-xs font-bold text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm cursor-pointer transition-all">
                Documentos Corporativos
              </TabsTrigger>
              <TabsTrigger value="labor-docs" className="rounded-xl px-2 py-2.5 text-xs font-bold text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm cursor-pointer transition-all">
                Obrigações Trabalhistas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="company-docs" className="space-y-8 focus-visible:outline-none">
              {renderDocumentTable(sortedCompanyDocs)}
            </TabsContent>

            <TabsContent value="labor-docs" className="focus-visible:outline-none">
              {renderDocumentTable(sortedLaborDocs)}
            </TabsContent>
          </Tabs>
        </div>

        {/* Modal de Confirmação de Exclusão ou Desativação */}
        <Dialog open={deleteDocDialogOpen} onOpenChange={(open) => { if (!deleteDocLoading) setDeleteDocDialogOpen(open) }}>
          <DialogContent className="rounded-3xl max-w-md">
            <DialogHeader>
              <div className="mx-auto w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 mb-2">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <DialogTitle className="text-xl font-bold text-center text-slate-900">
                {deletingDoc?.hasFile ? "Excluir Arquivo do Documento" : deletingDoc?.isCustom ? "Excluir Documento" : "Desabilitar Documento"}
              </DialogTitle>
              <DialogDescription asChild>
                <div className="text-center text-slate-600 space-y-3 mt-2 text-sm">
                  <p>
                    Documento: <strong className="text-slate-900">{deletingDoc?.label}</strong>
                  </p>

                  {deletingDoc?.hasFile ? (
                    <div className="p-3 bg-red-50/80 border border-red-200 rounded-2xl text-xs text-red-900 text-left space-y-1.5">
                      <p className="font-bold flex items-center gap-1.5 text-red-800">
                        <Trash2 className="w-3.5 h-3.5 shrink-0" />
                        O arquivo será expurgado do Cloudflare R2.
                      </p>
                      <p className="text-[11px] text-red-700">
                        Você pode optar por remover apenas o arquivo (o documento voltará a ser pendente) ou remover o arquivo e desabilitar o documento (para que não fique como pendência).
                      </p>
                    </div>
                  ) : deletingDoc?.isCustom ? (
                    <p className="text-xs text-slate-500">
                      Este documento adicional será removido permanentemente da lista de obrigações da empresa.
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Este documento deixará de ser obrigatório para esta empresa, será movido para o final da lista e não constará mais como pendência.
                    </p>
                  )}
                </div>
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="flex-col sm:flex-col gap-2 mt-3">
              {deletingDoc?.hasFile && (
                <>
                  <Button
                    onClick={() => handleDeleteDocConfirm(true, false)}
                    disabled={deleteDocLoading}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl w-full cursor-pointer gap-2"
                  >
                    {deleteDocLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Excluir Arquivo (Manter Documento)
                  </Button>
                  <Button
                    onClick={() => handleDeleteDocConfirm(true, true)}
                    disabled={deleteDocLoading}
                    variant="outline"
                    className="border-red-200 text-red-700 hover:bg-red-50 font-bold rounded-xl w-full cursor-pointer gap-2"
                  >
                    <Ban className="w-4 h-4" />
                    Excluir Arquivo e Desabilitar Documento
                  </Button>
                </>
              )}

              {!deletingDoc?.hasFile && deletingDoc?.isCustom && (
                <Button
                  onClick={() => handleDeleteDocConfirm(false, false)}
                  disabled={deleteDocLoading}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl w-full cursor-pointer gap-2"
                >
                  {deleteDocLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Sim, Excluir Documento
                </Button>
              )}

              {!deletingDoc?.hasFile && !deletingDoc?.isCustom && (
                <Button
                  onClick={() => {
                    handleToggleDocStatus(deletingDoc.type, true, deletingDoc.label, false)
                    setDeleteDocDialogOpen(false)
                  }}
                  disabled={deleteDocLoading}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl w-full cursor-pointer gap-2"
                >
                  <Ban className="w-4 h-4" />
                  Sim, Desabilitar Documento
                </Button>
              )}

              <Button
                variant="ghost"
                onClick={() => setDeleteDocDialogOpen(false)}
                disabled={deleteDocLoading}
                className="rounded-xl w-full cursor-pointer text-slate-500"
              >
                Cancelar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SpyPageGuard>
    </AppLayout>
  )
}

