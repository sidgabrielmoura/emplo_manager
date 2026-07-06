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
import { FileText, CheckCircle2, Clock, Upload, Loader2, Eye, Download, Pencil, Trash2, Save, Building2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { getCompanyDocuments, updateCompanyDocument, getCompanyData, downloadFile, getCompanyRequiredDocumentsAdmin, uploadImage } from "@/actions/requests"
import { toast } from "sonner"
import Link from "next/link"
import { Dialog, DialogContent, DialogTrigger, DialogClose } from "@/components/ui/dialog"
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
          setDocsLoading(true)
          const updatedDocs = await getCompanyDocuments(loadedCompany.id)
          setDocuments(updatedDocs)

          setReqDocsLoading(true)
          const reqDocs = await getCompanyRequiredDocumentsAdmin(loadedCompany.id)
          setRequiredDocs(reqDocs || [])
        }
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

  const handleClearDocument = async (vid: string, type: string) => {
    if (!verifyAction()) return
    if (!confirm("Tem certeza que deseja remover o arquivo deste documento?")) return

    setUploadLoading(true)
    setDocsLoading(true)
    try {
      await updateCompanyDocument({
        id: vid,
        companyId: company_selected?.id || localStorage.getItem('company_id') || '',
        type: type,
        clear: true
      })
      toast.success("Arquivo removido com sucesso!")
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

  const renderDocumentTable = (docList: { type: string, label: string }[], isAdditional?: boolean) => {
    const stats = {
      total: docList.length,
      approved: docList.filter(item => documents.find(d => d.type === item.type)?.status === 'APPROVED').length,
      pending: docList.length - docList.filter(item => documents.find(d => d.type === item.type)?.status === 'APPROVED').length
    }

    return (
      <div className="space-y-4 md:space-y-6 w-full">
        {!isAdditional && (
          <div className="grid grid-cols-3 gap-2 md:gap-4 mb-2">
            <Card className="rounded-2xl md:rounded-3xl border-slate-100 shadow-sm bg-white p-3 md:p-4 flex flex-col sm:flex-row items-center sm:items-start gap-2 md:gap-4">
              <div className="p-2 md:p-3 bg-slate-50 rounded-xl md:rounded-2xl shrink-0">
                <FileText className="w-4 h-4 md:w-5 md:h-5 text-slate-400" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-[9px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Itens</p>
                <p className="text-sm md:text-xl font-black text-slate-700 leading-none mt-0.5 md:mt-1">{stats.total}</p>
              </div>
            </Card>
            <Card className="rounded-2xl md:rounded-3xl border-slate-100 shadow-sm bg-white p-3 md:p-4 flex flex-col sm:flex-row items-center sm:items-start gap-2 md:gap-4">
              <div className="p-2 md:p-3 bg-emerald-50 rounded-xl md:rounded-2xl shrink-0">
                <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-emerald-500" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-[9px] md:text-xs font-bold text-emerald-400 uppercase tracking-wider">Aprovados</p>
                <p className="text-sm md:text-xl font-black text-emerald-700 leading-none mt-0.5 md:mt-1">{stats.approved}</p>
              </div>
            </Card>
            <Card className="rounded-2xl md:rounded-3xl border-slate-100 shadow-sm bg-white p-3 md:p-4 flex flex-col sm:flex-row items-center sm:items-start gap-2 md:gap-4">
              <div className="p-2 md:p-3 bg-amber-50 rounded-xl md:rounded-2xl shrink-0">
                <Clock className="w-4 h-4 md:w-5 md:h-5 text-amber-500" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-[9px] md:text-xs font-bold text-amber-500 uppercase tracking-wider">Pendentes</p>
                <p className="text-sm md:text-xl font-black text-amber-700 leading-none mt-0.5 md:mt-1">{stats.pending}</p>
              </div>
            </Card>
          </div>
        )}

        <Card className="rounded-3xl md:rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-5 sm:p-6 md:p-8">
            <CardTitle className="text-slate-800 text-base md:text-xl font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600 animate-pulse" /> {isAdditional ? "Documentos Adicionais" : "Referência de Documentos"}
            </CardTitle>
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
                {/* Desktop View Table */}
                <div className="hidden md:block overflow-x-auto py-4">
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
                        const isCustom = type === 'CUSTOM' || (!COMPANY_DOCS.some(d => d.type === type) && !LABOR_DOCS.some(d => d.type === type));
                        const docData = documents.find(d =>
                          isCustom
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

                                        {docData?.fileUrl && (
                                          <div className="flex justify-end pt-2">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-2 h-auto py-1 px-2 text-xs font-bold cursor-pointer"
                                              onClick={() => handleClearDocument(docData.id, type)}
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

                {/* Mobile View Cards */}
                <div className="block md:hidden space-y-3 py-4">
                  {docList.map(({ type, label }) => {
                    const isCustom = type === 'CUSTOM' || (!COMPANY_DOCS.some(d => d.type === type) && !LABOR_DOCS.some(d => d.type === type));
                    const docData = documents.find(d =>
                      isCustom
                        ? (d.type === "CUSTOM" && d.name === label)
                        : d.type === type
                    )

                    return (
                      <div key={type + label} className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-3.5 transition-all hover:bg-slate-50/80">
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="text-xs font-bold text-slate-800 leading-snug break-words max-w-[70%]">{label}</h4>
                          <Badge variant={!docData ? "secondary" : docData.status === "APPROVED" ? "default" : "destructive"} className="shrink-0 font-bold text-[9px] rounded-lg">
                            {!docData ? "Pendente" : docData.status === "APPROVED" ? "Aprovado" : "Pendência"}
                          </Badge>
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

                        <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
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

                                  {docData?.fileUrl && (
                                    <div className="flex justify-end pt-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-2 h-auto py-1 px-2 text-xs font-bold cursor-pointer"
                                        onClick={() => handleClearDocument(docData.id, type)}
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

            <TabsContent value="labor-docs" className="focus-visible:outline-none">
              {renderDocumentTable(activeLaborDocs)}
            </TabsContent>
          </Tabs>
        </div>
      </SpyPageGuard>
    </AppLayout>
  )
}
