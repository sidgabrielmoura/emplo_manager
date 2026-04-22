"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Search, Eye, FileText, CheckCircle2, AlertCircle, Clock, BarChart3, Upload, Loader2, Download } from "lucide-react"
import { getDocsDashboard, getDocuments, updateEmployeeDocument, uploadImage, downloadFile } from "@/actions/requests"
import { useSnapshot } from "valtio"
import { useCompanyStore } from "@/stores/company"
import { useDocumentStore } from "@/stores/documents"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Badge } from "./ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "./ui/dialog"
import { toast } from "sonner"
import { Switch } from "./ui/switch"
import { getPTBRDocuments } from "@/lib/constants/documents"

const allowedTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
]

export function DocumentsContent() {
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [expirationFilter, setExpirationFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const useCompany = useSnapshot(useCompanyStore)
  const documentStore = useSnapshot(useDocumentStore)
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [issuedAt, setIssuedAt] = useState<string>("")
  const [expire, setExpire] = useState<boolean>(false)
  const [expireAt, setExpireAt] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const closeEditDocModal = useRef<HTMLButtonElement>(null)

  const now = new Date()

  const documentsWithDays = documentStore.documents?.map(doc => {
    const expiresAt = new Date(doc.expiresAt || '')
    const diffTime = expiresAt.getTime() - now.getTime()
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return {
      ...doc,
      daysRemaining
    }
  })

  function handleSelect(fileList?: FileList | null) {
    if (!fileList?.[0]) return

    const selected = fileList[0]

    if (!allowedTypes.includes(selected.type)) {
      toast.error("Formato de arquivo não permitido")
      return
    }

    setFile(selected)
    setPreview(URL.createObjectURL(selected))
  }

  const handleUploadImage = async (id: string, employeeId: string) => {
    if (!issuedAt) {
      toast.error("Informe a data de emissão")
      return
    }

    if (!expireAt && expire) {
      toast.error("Informe a data de vencimento")
      return
    }

    setLoading(true)
    try {
      const uploaded: any = await uploadImage(file!).catch(() => {
        toast.error("O arquivo selecionado é muito grande ou ocorreu um erro no upload")
        return null
      })

      if (!uploaded) {
        setLoading(false)
        return
      }

      const response = await updateEmployeeDocument({
        expiresAt: expireAt,
        issuedAt: issuedAt,
        fileUrl: uploaded.url,
        id,
      }, employeeId)

      if (response) {
        getDocsDashboard(useCompany.company_selected?.id || '')
        getDocuments(useCompany.company_selected?.id || '')
        toast.success('arquivos enviados com sucesso')
        closeEditDocModal.current?.click()
      }

    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Erro no upload")
    } finally {
      setLoading(false)
    }
  }

  const filteredDocuments = documentsWithDays?.filter((doc) => {
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter
    const matchesExpiration =
      expirationFilter === "all" ||
      (expirationFilter === "expiring" && doc.daysRemaining >= 0 && doc.daysRemaining <= 30) ||
      (expirationFilter === "expired" && doc.daysRemaining < 0)

    const matchesSearch =
      getPTBRDocuments(doc.type, doc.name).toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.employee?.name.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesStatus && matchesExpiration && matchesSearch
  })

  useEffect(() => {
    getDocsDashboard(useCompany.company_selected?.id || '')
    getDocuments(useCompany.company_selected?.id || '')
  }, [useCompany.company_selected?.id])

  return (
    <div className="space-y-6 lg:space-y-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">Central de Documentos</h1>
        <p className="text-slate-500 text-sm lg:text-base font-medium">Repositório unificado de conformidade e arquivos operacionais.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xxl:grid-cols-5 gap-4">
        {!documentStore.dashboard ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="rounded-4xl border-slate-100 shadow-sm bg-white overflow-hidden p-6 flex flex-col gap-4">
              <Skeleton className="w-11 h-11 rounded-2xl" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
            </Card>
          ))
        ) : (
          <>
            <MetricCard label="Total Geral" value={documentStore.dashboard?.total || 0} icon={<FileText className="w-5 h-5" />} color="text-slate-600" bg="bg-slate-50" />
            <MetricCard label="Aprovados" value={documentStore.dashboard?.approved || 0} icon={<CheckCircle2 className="w-5 h-5" />} color="text-emerald-600" bg="bg-emerald-50" />
            <MetricCard label="Pendentes" value={documentStore.dashboard?.pending || 0} icon={<Clock className="w-5 h-5" />} color="text-amber-600" bg="bg-amber-50" />
            <MetricCard label="Expirados" value={documentStore.dashboard?.expired || 0} icon={<AlertCircle className="w-5 h-5" />} color="text-red-600" bg="bg-red-50" />
            <MetricCard label="A Vencer" value={documentStore.dashboard?.expiring_soon || 0} icon={<BarChart3 className="w-5 h-5" />} color="text-amber-500" bg="bg-yellow-50" />
          </>
        )}
      </div>

      <Card className="rounded-3xl border-slate-100 shadow-sm bg-white overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Busque por documento ou funcionário..."
                className="pl-10 h-11 rounded-xl border-slate-100 bg-slate-50/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-44 h-11 rounded-xl border-slate-100 font-semibold text-slate-700">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="APPROVED" className="text-emerald-600">Aprovados</SelectItem>
                  <SelectItem value="PENDING" className="text-amber-600">Pendentes</SelectItem>
                  <SelectItem value="REJECTED" className="text-red-600">Expirados</SelectItem>
                </SelectContent>
              </Select>

              <Select value={expirationFilter} onValueChange={setExpirationFilter}>
                <SelectTrigger className="w-full sm:w-44 h-11 rounded-xl border-slate-100 font-semibold text-slate-700">
                  <SelectValue placeholder="Validade" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                  <SelectItem value="all">Ver Tudo</SelectItem>
                  <SelectItem value="expiring">Expirando (30 d)</SelectItem>
                  <SelectItem value="expired" className="text-red-600">Expirados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden bg-white">
        <CardHeader className="px-6 lg:px-8 py-6 border-b border-slate-50">
          <CardTitle className="text-lg lg:text-xl font-bold text-slate-900">Listagem de Documentos</CardTitle>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">Controle de arquivos e registros ativos</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="border-b border-slate-100">
                  <TableHead className="px-6 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Tipo de Documento</TableHead>
                  <TableHead className="px-6 font-bold text-slate-400 uppercase tracking-wider text-[10px] text-center">Colaborador</TableHead>
                  <TableHead className="px-6 font-bold text-slate-400 uppercase tracking-wider text-[10px] text-center">Situação</TableHead>
                  <TableHead className="px-6 font-bold text-slate-400 uppercase tracking-wider text-[10px] text-center">Vencimento</TableHead>
                  <TableHead className="px-6 font-bold text-slate-400 uppercase tracking-wider text-[10px] text-right text-nowrap">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!documentStore.dashboard ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-b border-slate-50">
                      <TableCell className="px-6 py-4"><Skeleton className="h-5 w-48" /></TableCell>
                      <TableCell className="px-6 py-4"><Skeleton className="h-5 w-32 mx-auto" /></TableCell>
                      <TableCell className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-lg mx-auto" /></TableCell>
                      <TableCell className="px-6 py-4"><Skeleton className="h-5 w-24 mx-auto" /></TableCell>
                      <TableCell className="px-6 py-4"><Skeleton className="h-8 w-8 rounded-lg ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredDocuments?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20">
                      <div className="flex flex-col items-center">
                        <FileText className="w-10 h-10 text-slate-200 mb-2" />
                        <p className="text-slate-400 font-medium">Nenhum documento encontrado.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDocuments?.map((doc) => (
                    <TableRow key={doc.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                      <TableCell className="px-6 py-4 font-bold text-slate-700">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-slate-50 text-slate-400 group-hover:text-emerald-600 transition-colors">
                            <FileText className="w-4 h-4" />
                          </div>
                          {getPTBRDocuments(doc.type, doc.name)}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-center font-semibold text-slate-500">{doc.employee?.name}</TableCell>
                      <TableCell className="px-6 py-4 text-center">
                        <Badge
                          className={`rounded-lg py-1 px-3 ${doc.status === "APPROVED"
                            ? "bg-emerald-50 text-emerald-600 border-none shadow-none"
                            : doc.status === "PENDING"
                              ? "bg-amber-50 text-amber-600 border-none shadow-none"
                              : "bg-red-50 text-red-600 border-none shadow-none"
                            }`}
                        >
                          {doc.status === "APPROVED" ? "Aprovado" : doc.status === "PENDING" ? "Pendente" : "Rejeitado"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-center font-bold text-slate-500 tabular-nums">
                        {doc.expiresAt ? new Date(doc.expiresAt).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : "---"}
                      </TableCell>
                      {doc.status !== "PENDING" ? (
                        <TableCell className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={doc.fileUrl || ''} target="_blank">
                              <Button variant="ghost" size="sm" className="size-8 p-0 cursor-pointer rounded-lg hover:bg-emerald-50 hover:text-emerald-600 text-slate-400">
                                <Eye className="size-4" />
                              </Button>
                            </Link>
                            {doc.fileUrl && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="size-8 p-0 cursor-pointer rounded-lg hover:bg-blue-50 hover:text-blue-600 text-slate-400"
                                onClick={() => downloadFile(
                                  doc.fileUrl!,
                                  `${getPTBRDocuments(doc.type, doc.name)}_${doc.employee?.name || ''}.${doc.fileUrl!.split('.').pop()?.split('?')[0] || 'pdf'}`
                                )}
                              >
                                <Download className="size-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      ) : (
                        <>
                          <TableCell className="px-6 py-4 text-right">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="size-8 p-0 cursor-pointer rounded-lg hover:bg-emerald-50 hover:text-emerald-600 text-slate-400">
                                  <Upload className="size-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl! w-full">
                                <div className="space-y-5">
                                  <h3 className="text-lg font-semibold">Enviar documento</h3>

                                  <div className="flex flex-col gap-2">
                                    <Button
                                      variant="outline"
                                      className="w-fit cursor-pointer"
                                      onClick={() => inputRef.current?.click()}
                                    >
                                      Selecionar arquivo
                                    </Button>

                                    <p className="text-xs text-muted-foreground">
                                      Formatos aceitos: PDF, Word, Excel e PowerPoint
                                    </p>
                                  </div>

                                  <input
                                    ref={inputRef}
                                    type="file"
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                                    hidden
                                    onChange={(e) => handleSelect(e.target.files)}
                                  />

                                  {preview && file && (
                                    <div className="flex items-center justify-between gap-3 rounded-md border p-2">
                                      <a
                                        href={preview}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-primary line-clamp-1 underline underline-offset-4 hover:opacity-80"
                                      >
                                        {file.name}
                                      </a>

                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="cursor-pointer text-destructive"
                                        onClick={() => {
                                          setFile(null)
                                          setPreview(null)
                                        }}
                                      >
                                        Remover
                                      </Button>
                                    </div>
                                  )}

                                  <section>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      <div className="space-y-1">
                                        <label className="text-sm font-medium">Data de emissão</label>
                                        <Input
                                          type="date"
                                          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                          onChange={(e) => setIssuedAt(e.target.value)}
                                        />
                                      </div>

                                      <div className="space-y-1">
                                        <label className="text-sm font-medium">Data de vencimento</label>
                                        <Input
                                          disabled={!expire}
                                          type="date"
                                          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                          onChange={(e) => setExpireAt(e.target.value)}
                                        />
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-3 mt-5 justify-end">
                                      <p className="text-sm text-muted-foreground">Este documento tem validade?</p>
                                      <Switch onCheckedChange={(value) => setExpire(value)} checked={expire} className="cursor-pointer" />
                                    </div>
                                  </section>

                                  <div className="flex justify-end gap-2 pt-2">
                                    <Button
                                      variant="secondary"
                                      className="cursor-pointer"
                                      onClick={() => {
                                        setFile(null)
                                        setPreview(null)
                                        setIssuedAt("")
                                        setExpireAt("")
                                      }}
                                    >
                                      Limpar
                                    </Button>

                                    <Button
                                      className="cursor-pointer gap-2"
                                      disabled={!file || loading}
                                      onClick={() => handleUploadImage(doc.id, doc.employeeId || '')}
                                    >
                                      Enviar documento
                                      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                    </Button>
                                    <DialogClose ref={closeEditDocModal} />
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({ label, value, icon, color, bg }: { label: string, value: number, icon: any, color: string, bg: string }) {
  return (
    <Card className="rounded-4xl border-slate-100 shadow-sm bg-white overflow-hidden p-6 flex flex-col gap-4">
      <div className={`p-3 w-fit rounded-2xl ${bg} ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <p className={`text-2xl font-black ${color} tracking-tight`}>{value}</p>
      </div>
    </Card>
  )
}
