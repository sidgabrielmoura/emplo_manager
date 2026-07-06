"use client"

import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useCompanyStore } from "@/stores/company"
import { useSnapshot } from "valtio"
import { useEffect, useState, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import axios from "axios"
import {
  ShieldAlert, Plus, Search, Copy, Check, Pencil, ShieldX,
  ShieldCheck, Activity, ArrowLeft, Clock, Info, Globe, Smartphone, Laptop,
  Building2, Loader2, Save, Trash2, RefreshCw, ChevronDown, ChevronUp
} from "lucide-react"
import { getCostCenters } from "@/actions/requests"

function getDaysRemaining(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - new Date().getTime()
  if (diff <= 0) return 0
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// Define the 8 pages for spy permissions
const PERMISSION_PAGES = [
  { key: "dashboard", label: "Painel (Dashboard)" },
  { key: "employees", label: "Funcionários" },
  { key: "passport", label: "Perfil de Qualificação" },
  { key: "documents", label: "Documentos de Funcionários" },
  { key: "company-documents", label: "Documentos da Empresa" },
  { key: "cost-centers", label: "Centros de Custo" },
  { key: "users", label: "Usuários e Funções" },
  { key: "settings", label: "Configurações" }
]

export default function InfiltrationSettingsPage() {
  const router = useRouter()
  const { company_selected } = useSnapshot(useCompanyStore)
  const [loading, setLoading] = useState(true)
  const [spies, setSpies] = useState<any[]>([])
  const [costCenters, setCostCenters] = useState<any[]>([])

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")

  // Modals state
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false)
  const [isLogsDialogOpen, setIsLogsDialogOpen] = useState(false)
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false)
  const [isCcExpanded, setIsCcExpanded] = useState(false)

  const [editingSpy, setEditingSpy] = useState<any | null>(null)
  const [logsSpy, setLogsSpy] = useState<any | null>(null)
  const [auditLogs, setAuditLogs] = useState<{ logs: any[], sessions: any[] }>({ logs: [], sessions: [] })
  const [logsLoading, setLogsLoading] = useState(false)
  const [generatedLink, setGeneratedLink] = useState("")

  // Delete & regenerate state
  const [deletingSpy, setDeletingSpy] = useState<any | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [regenerateLoading, setRegenerateLoading] = useState<string | null>(null)
  // Form State
  const [formName, setFormName] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formObservations, setFormObservations] = useState("")
  const [formValidDays, setFormValidDays] = useState(7)
  const [formPermissions, setFormPermissions] = useState<Record<string, { view: boolean; edit: boolean }>>(
    PERMISSION_PAGES.reduce((acc, p) => ({ ...acc, [p.key]: { view: false, edit: false } }), {})
  )
  const [formCostCenters, setFormCostCenters] = useState<string[]>([])

  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  const dialogCloseRef = useRef<HTMLButtonElement>(null)

  const fetchSpies = async () => {
    const companyId = company_selected?.id || localStorage.getItem('company_id')
    if (!companyId) return

    setLoading(true)
    try {
      const response = await axios.get(`/api/spy/list?companyId=${companyId}&status=${statusFilter}&search=${searchQuery}`)
      setSpies(response.data)
    } catch (error) {
      console.error(error)
      toast.error("Erro ao carregar lista de espiões")
    } finally {
      setLoading(false)
    }
  }

  const fetchCostCenters = async () => {
    const companyId = company_selected?.id || localStorage.getItem('company_id')
    if (!companyId) return
    try {
      const data = await getCostCenters(companyId)
      setCostCenters(data || [])
    } catch (e) {
      console.error("Failed to load cost centers", e)
    }
  }

  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get("notice") === "admin_session_active") {
      toast.info("Você está conectado como administrador. O link de espião só funciona em um navegador diferente ou aba anônima sem sessão ativa.", {
        duration: 8000
      })
    }
  }, [])

  useEffect(() => {
    fetchSpies()
    fetchCostCenters()
  }, [company_selected, statusFilter])

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      fetchSpies()
    }
  }

  const openCreateModal = () => {
    setEditingSpy(null)
    setFormName("")
    setFormEmail("")
    setFormObservations("")
    setFormValidDays(7)
    setFormPermissions(
      PERMISSION_PAGES.reduce((acc, p) => ({ ...acc, [p.key]: { view: false, edit: false } }), {})
    )
    setFormCostCenters([])
    setIsCcExpanded(false)
    setIsFormDialogOpen(true)
  }

  const openEditModal = (spy: any) => {
    setEditingSpy(spy)
    setFormName(spy.name)
    setFormEmail(spy.email)
    setFormObservations(spy.observations || "")
    setFormValidDays(spy.validDays)

    // Parse permissions from DB json
    const parsedPermissions = { ...spy.permissions }
    // Ensure all pages exist in the form state
    PERMISSION_PAGES.forEach(p => {
      if (!parsedPermissions[p.key]) {
        parsedPermissions[p.key] = { view: false, edit: false }
      }
    })
    setFormPermissions(parsedPermissions)

    // Parse cost centers
    setFormCostCenters(spy.costCenters || [])
    setIsCcExpanded(false)
    setIsFormDialogOpen(true)
  }

  const handleTogglePagePermission = (pageKey: string, action: "view" | "edit", checked: boolean) => {
    setFormPermissions(prev => {
      const updated = { ...prev }
      updated[pageKey] = { ...updated[pageKey], [action]: checked }

      // If edit is enabled, automatically check view
      if (action === "edit" && checked) {
        updated[pageKey].view = true
      }

      // If view is disabled, automatically disable edit
      if (action === "view" && !checked) {
        updated[pageKey].edit = false
      }

      return updated
    })
  }

  const handleToggleCostCenter = (id: string, checked: boolean) => {
    setFormCostCenters(prev => {
      let nextCostCenters
      if (checked) {
        nextCostCenters = [...prev, id]
      } else {
        nextCostCenters = prev.filter(ccId => ccId !== id)
      }

      // Se houver centros de custo selecionados, força a visualização de Centros de Custo para true
      if (nextCostCenters.length > 0) {
        setFormPermissions(p => ({
          ...p,
          "cost-centers": { ...p["cost-centers"], view: true }
        }))
      }

      return nextCostCenters
    })
  }

  const isAllCostCentersSelected = costCenters.length > 0 && formCostCenters.length === costCenters.length

  const handleToggleAllCostCenters = (checked: boolean) => {
    if (checked) {
      setFormCostCenters(costCenters.map(cc => cc.id))
      // E automaticamente força a visualização de cost-centers para true
      setFormPermissions(prev => ({
        ...prev,
        "cost-centers": { ...prev["cost-centers"], view: true }
      }))
    } else {
      setFormCostCenters([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim() || !formEmail.trim() || !formValidDays) {
      toast.error("Por favor, preencha todos os campos obrigatórios")
      return
    }

    const hasSelectedCostCenters = formCostCenters.length > 0

    // Se a página de Centros de Custo estiver habilitada para visualização, mas nenhum centro foi marcado, barra!
    if (formPermissions["cost-centers"]?.view === true && !hasSelectedCostCenters) {
      toast.error("Para habilitar a visualização de Centros de Custo, você deve marcar pelo menos um Centro de Custo no formulário")
      return
    }

    setSubmitLoading(true)
    try {
      // Force settings and users view/edit to false
      const finalPermissions = {
        ...formPermissions,
        settings: { view: false, edit: false },
        users: { view: false, edit: false },
        "cost-centers": {
          ...formPermissions["cost-centers"],
          view: hasSelectedCostCenters ? true : (formPermissions["cost-centers"]?.view || false)
        }
      }

      if (editingSpy) {
        // Update
        await axios.post("/api/spy/update", {
          id: editingSpy.id,
          name: formName.trim(),
          email: formEmail.trim(),
          observations: formObservations.trim(),
          validDays: Number(formValidDays),
          permissions: finalPermissions,
          costCenters: formCostCenters
        })
        toast.success("Acesso espião atualizado com sucesso!")
        setIsFormDialogOpen(false)
        fetchSpies()
      } else {
        // Create
        const companyId = company_selected?.id || localStorage.getItem('company_id')
        const response = await axios.post("/api/spy/create", {
          name: formName.trim(),
          email: formEmail.trim(),
          observations: formObservations.trim(),
          validDays: Number(formValidDays),
          permissions: finalPermissions,
          costCenters: formCostCenters,
          companyId
        })

        toast.success("Acesso espião criado com sucesso!")
        setIsFormDialogOpen(false)
        fetchSpies()

        // Open secure link dialog
        const origin = window.location.origin
        const tokenLink = `${origin}/infiltracao/acesso/${response.data.rawToken}`
        setGeneratedLink(tokenLink)
        setIsLinkDialogOpen(true)
      }
    } catch (error: any) {
      console.error(error)
      toast.error(error.response?.data?.error || "Erro ao salvar acesso espião")
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleToggleStatus = async (spy: any) => {
    const nextStatus = spy.status === "ACTIVE" ? "BLOCKED" : "ACTIVE"
    try {
      await axios.post("/api/spy/toggle-status", {
        id: spy.id,
        status: nextStatus
      })
      toast.success(nextStatus === "BLOCKED" ? "Acesso espião bloqueado!" : "Acesso espião reativado!")
      fetchSpies()
    } catch (error) {
      console.error(error)
      toast.error("Erro ao alterar status do espião")
    }
  }

  const openAuditLogs = async (spy: any) => {
    setLogsSpy(spy)
    setLogsLoading(true)
    setIsLogsDialogOpen(true)
    try {
      const response = await axios.get(`/api/spy/logs?spyAccessId=${spy.id}`)
      setAuditLogs(response.data)
    } catch (e) {
      console.error(e)
      toast.error("Erro ao carregar logs de auditoria")
    } finally {
      setLogsLoading(false)
    }
  }

  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm("Tem certeza que deseja desconectar esta sessão ativa imediatamente?")) return
    try {
      await axios.post("/api/spy/revoke-session", { sessionId })
      toast.success("Sessão revogada com sucesso!")
      if (logsSpy) {
        openAuditLogs(logsSpy) // reload logs
      }
      fetchSpies()
    } catch (e) {
      console.error(e)
      toast.error("Erro ao revogar sessão")
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    toast.success("Link copiado para a área de transferência!")
    setTimeout(() => setCopiedId(null), 2000)
  }

  const openDeleteDialog = (spy: any) => {
    setDeletingSpy(spy)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteSpy = async () => {
    if (!deletingSpy) return
    setDeleteLoading(true)
    try {
      await axios.delete(`/api/spy/delete?id=${deletingSpy.id}`)
      toast.success("Acesso espião removido com sucesso!")
      setIsDeleteDialogOpen(false)
      setDeletingSpy(null)
      fetchSpies()
    } catch (error) {
      console.error(error)
      toast.error("Erro ao remover acesso espião")
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleRegenerateToken = async (spy: any) => {
    setRegenerateLoading(spy.id)
    try {
      const response = await axios.post("/api/spy/regenerate-token", { id: spy.id })
      const origin = window.location.origin
      const tokenLink = `${origin}/infiltracao/acesso/${response.data.rawToken}`
      setGeneratedLink(tokenLink)
      setIsLinkDialogOpen(true)
      toast.success("Novo link gerado! Sessões anteriores foram revogadas.")
    } catch (error) {
      console.error(error)
      toast.error("Erro ao regenerar link de acesso")
    } finally {
      setRegenerateLoading(null)
    }
  }

  return (
    <AppLayout>
      <div className="w-full max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-500 rounded-lg hover:bg-slate-100 mr-1"
                onClick={() => router.push("/settings")}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Módulo de Infiltração
              </h1>
            </div>
            <p className="text-sm text-slate-500 font-medium">
              Gere e audite credenciais de acesso temporário com permissões específicas para terceiros e auditores.
            </p>
          </div>

          <Button
            onClick={openCreateModal}
            className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold h-11 px-5 shadow-lg shadow-purple-100 flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" /> Gerar Acesso Espião
          </Button>
        </div>

        {/* Filters bar */}
        <div className="flex flex-col md:flex-row gap-4 bg-white border border-slate-100 shadow-sm p-4 rounded-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por nome ou e-mail..."
              className="pl-10 h-11 rounded-xl bg-slate-50/50 border-slate-200"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyPress}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="h-11 rounded-xl bg-slate-50/50 border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer min-w-[140px]"
            >
              <option value="ALL">Todos os status</option>
              <option value="ACTIVE">Ativo</option>
              <option value="BLOCKED">Bloqueado</option>
              <option value="EXPIRED">Expirado</option>
            </select>

            <Button
              onClick={fetchSpies}
              className="h-11 px-6 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 text-sm cursor-pointer shadow-md"
            >
              Filtrar
            </Button>
          </div>
        </div>

        {/* Table of Spies */}
        <Card className="rounded-[2rem] p-0 border-slate-100 shadow-sm overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/30 border-b border-slate-100 p-6">
            <CardTitle className="text-slate-800 text-base font-bold flex items-center gap-2">
              Credenciais de Espião Ativas / Registradas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ) : spies.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                <ShieldAlert className="w-10 h-10 text-slate-300" />
                <p className="text-slate-400 font-medium text-sm">Nenhum acesso espião registrado.</p>
              </div>
            ) : (
              <div className="overflow-x-auto pb-6 px-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome / E-mail</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Tempo Válido</TableHead>
                      <TableHead className="text-center">Expiração</TableHead>
                      <TableHead className="text-center">Criado Por</TableHead>
                      <TableHead className="text-center">Último Acesso</TableHead>
                      <TableHead className="text-right px-6">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {spies.map((spy) => {
                      const daysRemaining = getDaysRemaining(spy.expiresAt)
                      const isExpired = new Date(spy.expiresAt) <= new Date() || spy.status === "EXPIRED"

                      return (
                        <TableRow key={spy.id} className="hover:bg-slate-50/50">
                          <TableCell className="font-semibold text-slate-800">
                            <div>
                              <p className="text-sm font-bold text-slate-800">{spy.name}</p>
                              <p className="text-xs text-slate-400 font-medium mt-0.5">{spy.email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={spy.status === "ACTIVE" ? "default" : spy.status === "BLOCKED" ? "destructive" : "secondary"}
                              className={`${spy.status === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50"
                                : spy.status === "BLOCKED"
                                  ? "bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-50"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-100"
                                } font-bold rounded-lg px-2.5 py-0.5`}
                            >
                              {spy.status === "ACTIVE" ? "Ativo" : spy.status === "BLOCKED" ? "Bloqueado" : "Expirado"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-slate-600 font-medium text-xs">
                            {spy.validDays} {spy.validDays === 1 ? 'dia' : 'dias'}
                          </TableCell>
                          <TableCell className="text-center text-slate-500 font-bold text-xs tabular-nums">
                            {new Date(spy.expiresAt).toLocaleDateString("pt-BR", { timeZone: 'UTC' })}
                            {daysRemaining !== null && !isExpired && (
                              <span className="block text-[10px] text-purple-600 font-semibold mt-0.5">({daysRemaining} {daysRemaining === 1 ? 'dia restante' : 'dias restantes'})</span>
                            )}
                            {isExpired && (
                              <span className="block text-[10px] text-red-500 font-semibold mt-0.5">(Expirado)</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-slate-500 font-medium text-xs">
                            {spy.createdBy}
                          </TableCell>
                          <TableCell className="text-center text-slate-500 font-medium text-xs">
                            {spy.lastAccessAt ? new Date(spy.lastAccessAt).toLocaleString("pt-BR") : "Nunca"}
                          </TableCell>
                          <TableCell className="text-right px-6">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Edit details */}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="size-8 p-0 cursor-pointer rounded-lg hover:bg-slate-100 text-slate-400"
                                onClick={() => openEditModal(spy)}
                              >
                                <Pencil className="size-4 text-slate-600" />
                              </Button>

                              {/* Toggle block/unblock status */}
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`size-8 p-0 cursor-pointer rounded-lg ${spy.status === "ACTIVE"
                                  ? "hover:bg-rose-50 text-rose-600"
                                  : "hover:bg-emerald-50 text-emerald-600"
                                  }`}
                                onClick={() => handleToggleStatus(spy)}
                              >
                                {spy.status === "ACTIVE" ? (
                                  <ShieldX className="size-4" />
                                ) : (
                                  <ShieldCheck className="size-4" />
                                )}
                              </Button>

                              {/* Audit & Logs */}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="size-8 p-0 cursor-pointer rounded-lg hover:bg-purple-50 text-purple-600"
                                onClick={() => openAuditLogs(spy)}
                              >
                                <Activity className="size-4" />
                              </Button>

                              {/* Regenerate link */}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="size-8 p-0 cursor-pointer rounded-lg hover:bg-blue-50 text-blue-500"
                                title="Copiar novo link de acesso"
                                onClick={() => handleRegenerateToken(spy)}
                                disabled={regenerateLoading === spy.id}
                              >
                                {regenerateLoading === spy.id ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="size-4" />
                                )}
                              </Button>

                              {/* Delete */}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="size-8 p-0 cursor-pointer rounded-lg hover:bg-red-50 text-red-500"
                                title="Excluir acesso espião"
                                onClick={() => openDeleteDialog(spy)}
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
            )}
          </CardContent>
        </Card>
      </div>

      {/* Creation / Edition Dialog */}
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="max-w-3xl! w-full rounded-2xl bg-white p-6 shadow-xl border overflow-y-auto max-h-[90vh]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h3 className="font-black text-xl text-slate-800 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-purple-600" />
                {editingSpy ? "Editar Acesso Espião" : "Gerar Novo Acesso Espião"}
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-semibold">
                Configure os limites de acesso temporário abaixo. O link gerado expirará automaticamente.
              </p>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Nome do Espião *</Label>
                <Input
                  placeholder="Ex: Auditor da ANVISA, Investidor XYZ..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="h-11 rounded-xl bg-slate-50/50 border-slate-200"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">E-mail do Destinatário *</Label>
                <Input
                  type="email"
                  placeholder="Ex: auditoria@empresa.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="h-11 rounded-xl bg-slate-50/50 border-slate-200"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Tempo de Acesso (Dias) *</Label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={formValidDays}
                  onChange={(e) => setFormValidDays(Number(e.target.value))}
                  className="h-11 rounded-xl bg-slate-50/50 border-slate-200"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Observações Internas (Opcional)</Label>
                <Input
                  placeholder="Ex: Auditoria anual da filiais."
                  value={formObservations}
                  onChange={(e) => setFormObservations(e.target.value)}
                  className="h-11 rounded-xl bg-slate-50/50 border-slate-200"
                />
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Granular Permissions Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-4 h-4 text-purple-500" />
                Permissões de Páginas
              </h4>
              <p className="text-[11px] text-slate-400 font-semibold">
                Caso a visualização de uma página seja desativada, ela permanecerá no menu do espião, porém seu conteúdo será exibido em blur.
              </p>

              <div className="border border-slate-100 rounded-2xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead>Página / Módulo</TableHead>
                      <TableHead className="w-32 text-center">Visualizar</TableHead>
                      <TableHead className="w-32 text-center">Editar / Criar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {PERMISSION_PAGES.map((page) => {
                      const pagePerm = formPermissions[page.key] || { view: false, edit: false }
                      const isSecurityPage = page.key === "settings" || page.key === "users"
                      const hasSelectedCc = formCostCenters.length > 0
                      const isCostCentersViewDisabled = page.key === "cost-centers" && hasSelectedCc

                      const isViewChecked = isSecurityPage
                        ? false
                        : (isCostCentersViewDisabled ? true : pagePerm.view)

                      const isEditChecked = isSecurityPage ? false : pagePerm.edit

                      return (
                        <TableRow key={page.key} className="hover:bg-slate-50/30">
                          <TableCell className="font-semibold text-slate-700 text-xs">
                            {page.label}
                            {isSecurityPage && (
                              <span className="text-[9px] text-red-500 font-bold ml-1.5 px-1.5 py-0.5 bg-red-50 rounded-md">
                                Indisponível para Espião
                              </span>
                            )}
                            {isCostCentersViewDisabled && (
                              <span className="text-[9px] text-emerald-600 font-bold ml-1.5 px-1.5 py-0.5 bg-emerald-50 rounded-md">
                                Obrigatório (Centros selecionados)
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={isViewChecked}
                              onCheckedChange={(checked) => handleTogglePagePermission(page.key, "view", checked)}
                              disabled={isSecurityPage || isCostCentersViewDisabled}
                              className="cursor-pointer"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={isEditChecked}
                              onCheckedChange={(checked) => handleTogglePagePermission(page.key, "edit", checked)}
                              disabled={isSecurityPage}
                              className="cursor-pointer"
                            />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Authorized Cost Centers Colapsável */}
            <div className="space-y-3 border border-slate-100 rounded-2xl p-4 bg-slate-50/30 transition-all duration-300">
              <button
                type="button"
                onClick={() => setIsCcExpanded(!isCcExpanded)}
                className="flex items-center justify-between w-full cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-500" />
                  <div className="text-left">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Centros de Custo Autorizados *
                    </h4>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      {formCostCenters.length === 0
                        ? "Nenhum centro de custo selecionado"
                        : `${formCostCenters.length} ${formCostCenters.length === 1 ? "centro selecionado" : "centros selecionados"}`
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {formCostCenters.length > 0 && (
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold rounded-lg text-[9px] px-2 py-0.5">
                      Configurado
                    </Badge>
                  )}
                  <ChevronDown className={`w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-300 ${isCcExpanded ? "rotate-180" : ""}`} />
                </div>
              </button>

              {isCcExpanded && (
                <div className="pt-3 space-y-3 border-t border-slate-100 animate-fadeIn">
                  <p className="text-[11px] text-slate-400 font-semibold">
                    O espião só poderá visualizar funcionários, documentos e dados vinculados aos centros de custo selecionados.
                  </p>

                  {costCenters.length === 0 ? (
                    <p className="text-slate-400 text-xs py-2">Nenhum centro de custo cadastrado. Cadastre um centro antes de criar o espião.</p>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 pb-1.5 border-b border-slate-50">
                        <input
                          type="checkbox"
                          id="select-all-cc"
                          checked={isAllCostCentersSelected}
                          onChange={(e) => handleToggleAllCostCenters(e.target.checked)}
                          className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                        />
                        <Label htmlFor="select-all-cc" className="text-xs font-black text-slate-600 cursor-pointer select-none">
                          Selecionar Todos os Centros
                        </Label>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-48 overflow-y-auto pt-1 animate-slideDown">
                        {costCenters.map((cc) => (
                          <label key={cc.id} className={`flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer select-none transition-colors border ${formCostCenters.includes(cc.id) ? "border-purple-100 bg-purple-50/10" : "border-slate-100 bg-white"}`}>
                            <input
                              type="checkbox"
                              checked={formCostCenters.includes(cc.id)}
                              onChange={(e) => handleToggleCostCenter(cc.id, e.target.checked)}
                              className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4"
                            />
                            <div>
                              <p className="text-xs font-bold text-slate-700">{cc.name}</p>
                              <p className="text-[10px] text-slate-400 font-semibold">{cc.city} - {cc.state}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-2.5 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsFormDialogOpen(false)} className="flex-1 py-5 rounded-xl cursor-pointer">
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitLoading}
                className="flex-1 py-5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold cursor-pointer"
              >
                {submitLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {editingSpy ? "Salvar Alterações" : "Gerar Acesso Seguro"}
              </Button>
            </div>
            <DialogClose ref={dialogCloseRef} className="hidden" />
          </form>
        </DialogContent>
      </Dialog>

      {/* Copy Link Dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="max-w-lg! w-full rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-3 bg-purple-500 text-purple-300 rounded-3xl">
              <ShieldAlert className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black tracking-tight">Link de Acesso Gerado!</h3>
              <p className="text-xs text-slate-400 font-semibold px-2">
                Copie o link seguro abaixo. Por razões de segurança, este token é exibido apenas uma vez!
              </p>
            </div>

            <Card>
              <CardContent className="flex items-center gap-2">
                <h1 className="text-xs font-semibold max-w-60 font-mono line-clamp-1 select-all">{generatedLink}</h1>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-lg shrink-0 cursor-pointer"
                  onClick={() => copyToClipboard(generatedLink, "link")}
                >
                  {copiedId === "link" ? (
                    <Check className="w-4 h-4 text-emerald-400 animate-scale" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </CardContent>
            </Card>

            <p className="text-[10px] text-amber-400 font-semibold bg-amber-950 border border-amber-900/30 px-3 py-2 rounded-xl leading-relaxed">
              ⚠️ Não compartilhe este link de forma pública. Ele dá privilégios automáticos de visualização temporária ao portador!
            </p>

            <Button
              className="w-full py-5 bg-green-500 hover:bg-green-600 font-bold rounded-xl cursor-pointer"
              onClick={() => setIsLinkDialogOpen(false)}
            >
              Concluído
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-sm w-full rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-3 bg-red-50 text-red-500 rounded-2xl">
              <Trash2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black tracking-tight text-slate-800">Excluir Acesso Espião</h3>
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Tem certeza que deseja excluir o acesso de <span className="text-red-600 font-bold">{deletingSpy?.name}</span>?
                <br />Todas as sessões e logs de auditoria serão removidos permanentemente.
              </p>
            </div>
            <div className="flex gap-2 w-full pt-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl cursor-pointer"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={deleteLoading}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold cursor-pointer"
                onClick={handleDeleteSpy}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <><Loader2 className="size-4 animate-spin mr-2" /> Excluindo...</>
                ) : (
                  <><Trash2 className="size-4 mr-2" /> Excluir</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isLogsDialogOpen} onOpenChange={setIsLogsDialogOpen}>
        <DialogContent className="max-w-fit! w-full rounded-2xl bg-white p-6 shadow-xl border overflow-y-auto max-h-[90vh]">
          <div className="space-y-6">
            <div>
              <h3 className="font-black text-xl text-slate-800 flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-600" />
                Auditoria de Acesso: {logsSpy?.name}
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-semibold">
                Monitore o histórico de sessões ativas, navegadores e ações realizadas por este perfil espião.
              </p>
            </div>

            {logsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ) : (
              <Tabs defaultValue="sessions" className="w-full">
                <TabsList className="bg-slate-100 p-1 rounded-2xl w-fit flex gap-1 mb-4">
                  <TabsTrigger value="sessions" className="rounded-xl px-4 py-2 text-xs font-bold text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm cursor-pointer transition-all">
                    Sessões Ativas / Histórico
                  </TabsTrigger>
                  <TabsTrigger value="logs" className="rounded-xl px-4 py-2 text-xs font-bold text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm cursor-pointer transition-all">
                    Histórico de Ações (Logs)
                  </TabsTrigger>
                </TabsList>

                {/* Sessions Tab */}
                <TabsContent value="sessions" className="focus-visible:outline-none">
                  <div className="border border-slate-100 rounded-2xl overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50/50">
                        <TableRow>
                          <TableHead>Dispositivo / Navegador</TableHead>
                          <TableHead className="text-center">Endereço IP</TableHead>
                          <TableHead className="text-center">Localização</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead className="text-center">Data de Início</TableHead>
                          <TableHead className="text-center">Última Atividade</TableHead>
                          <TableHead className="text-right px-6">Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditLogs.sessions.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-6 text-slate-400">Nenhuma sessão registrada.</TableCell>
                          </TableRow>
                        ) : (
                          auditLogs.sessions.map((sess) => (
                            <TableRow key={sess.id} className="hover:bg-slate-50/30">
                              <TableCell className="font-semibold text-slate-700 text-xs">
                                <div className="flex items-center gap-2">
                                  {sess.device === "Mobile" ? (
                                    <Smartphone className="w-4 h-4 text-slate-400" />
                                  ) : (
                                    <Laptop className="w-4 h-4 text-slate-400" />
                                  )}
                                  <div>
                                    <p className="font-bold text-slate-700">{sess.os}</p>
                                    <p className="text-[10px] text-slate-400 font-semibold">{sess.browser}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-center text-slate-600 text-xs tabular-nums">{sess.ip || "—"}</TableCell>
                              <TableCell className="text-center text-slate-600 text-xs">
                                <div className="flex items-center justify-center gap-1">
                                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{sess.city ? `${sess.city}, ` : ""}{sess.country || "Desconhecido"}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant={sess.status === "ACTIVE" ? "default" : "secondary"}
                                  className={`${sess.status === "ACTIVE"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50"
                                    : sess.status === "REVOKED"
                                      ? "bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-50"
                                      : "bg-slate-100 text-slate-600 hover:bg-slate-100"
                                    } font-bold rounded-lg px-2 py-0.5 text-[10px]`}
                                >
                                  {sess.status === "ACTIVE" ? "Ativa" : sess.status === "REVOKED" ? "Revogada" : "Expirada"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center text-slate-500 font-medium text-xs tabular-nums">
                                {new Date(sess.createdAt).toLocaleString("pt-BR")}
                              </TableCell>
                              <TableCell className="text-center text-slate-500 font-medium text-xs tabular-nums">
                                {new Date(sess.lastActiveAt).toLocaleString("pt-BR")}
                              </TableCell>
                              <TableCell className="text-right px-6">
                                {sess.status === "ACTIVE" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:bg-red-50 hover:text-red-600 text-xs font-bold px-2 py-1 rounded-lg cursor-pointer"
                                    onClick={() => handleRevokeSession(sess.id)}
                                  >
                                    Desconectar
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                {/* Actions Logs Tab */}
                <TabsContent value="logs" className="focus-visible:outline-none">
                  <div className="border border-slate-100 rounded-2xl overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50/50">
                        <TableRow>
                          <TableHead>Ação</TableHead>
                          <TableHead>Detalhes</TableHead>
                          <TableHead className="text-center">Endereço IP</TableHead>
                          <TableHead className="text-center">Data/Hora</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditLogs.logs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-6 text-slate-400">Nenhum log registrado para este espião.</TableCell>
                          </TableRow>
                        ) : (
                          auditLogs.logs.map((log) => (
                            <TableRow key={log.id} className="hover:bg-slate-50/30">
                              <TableCell className="text-xs">
                                <Badge
                                  className={`${log.action === "LOGIN"
                                    ? "bg-blue-50 text-blue-700 border-blue-100"
                                    : log.action === "BLOCKED_ATTEMPT"
                                      ? "bg-rose-50 text-rose-700 border-rose-100"
                                      : "bg-slate-50 text-slate-700 border-slate-100"
                                    } font-bold rounded-lg px-2 py-0.5 text-[10px]`}
                                >
                                  {log.action}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-slate-700 font-semibold text-xs leading-relaxed">{log.details || "—"}</TableCell>
                              <TableCell className="text-center text-slate-500 font-medium text-xs tabular-nums">{log.ip || "—"}</TableCell>
                              <TableCell className="text-center text-slate-500 font-medium text-xs tabular-nums">
                                {new Date(log.createdAt).toLocaleString("pt-BR")}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={() => setIsLogsDialogOpen(false)} className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold h-11 px-6 cursor-pointer">
                Fechar painel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
