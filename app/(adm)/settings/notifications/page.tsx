"use client"

import { useState, useEffect } from "react"
import { useSnapshot } from "valtio"
import { useCompanyStore } from "@/stores/company"
import { AppLayout } from "@/components/app-layout"
import { toast } from "sonner"
import Link from "next/link"
import {
  Bell,
  Trash2,
  Plus,
  Search,
  Mail,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  Calendar,
  Eye,
  AlertCircle,
  Settings
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog"
import {
  getNotificationRecipients,
  createNotificationRecipient,
  deleteNotificationRecipient,
  updateNotificationRecipient,
  getEmailLogs
} from "@/actions/requests"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Recipient {
  id: string
  name: string
  email: string
  documentExpirationAlerts: boolean
  newEmployeeAlerts: boolean
}

interface EmailLog {
  id: string
  recipientEmail: string
  recipientName: string | null
  subject: string
  body: string
  status: string
  error: string | null
  sentAt: string
}

export default function NotificationsPage() {
  const companyStore = useSnapshot(useCompanyStore)
  const companyId = companyStore.company_selected?.id || ""

  // State Management
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [logs, setLogs] = useState<EmailLog[]>([])
  const [loadingRecipients, setLoadingRecipients] = useState(false)
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form State
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [docAlerts, setDocAlerts] = useState(true)
  const [empAlerts, setEmpAlerts] = useState(true)

  // Filters State
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"ALL" | "SUCCESS" | "FAILED">("ALL")
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null)

  // Fetch Data
  const loadRecipients = async () => {
    if (!companyId) return
    try {
      setLoadingRecipients(true)
      const data = await getNotificationRecipients(companyId)
      setRecipients(data)
    } catch (err) {
      toast.error("Erro ao carregar destinatários")
    } finally {
      setLoadingRecipients(false)
    }
  }

  const loadLogs = async () => {
    if (!companyId) return
    try {
      setLoadingLogs(true)
      const data = await getEmailLogs(companyId)
      setLogs(data)
    } catch (err) {
      toast.error("Erro ao carregar histórico de e-mails")
    } finally {
      setLoadingLogs(false)
    }
  }

  useEffect(() => {
    if (companyId) {
      loadRecipients()
      loadLogs()
    }
  }, [companyId])

  // Handlers
  const handleAddRecipient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) {
      toast.error("Preencha todos os campos obrigatórios")
      return
    }

    try {
      setSubmitting(true)
      await createNotificationRecipient({
        companyId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        documentExpirationAlerts: docAlerts,
        newEmployeeAlerts: empAlerts
      })
      toast.success("Destinatário adicionado com sucesso!")
      setName("")
      setEmail("")
      setDocAlerts(true)
      setEmpAlerts(true)
      loadRecipients()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Erro ao adicionar destinatário")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteRecipient = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover este destinatário?")) return
    try {
      await deleteNotificationRecipient(id)
      toast.success("Destinatário removido com sucesso!")
      loadRecipients()
    } catch (err) {
      toast.error("Erro ao remover destinatário")
    }
  }

  const handleTogglePreference = async (id: string, key: "documentExpirationAlerts" | "newEmployeeAlerts", currentValue: boolean) => {
    try {
      // Optimistic Update
      setRecipients(prev => prev.map(r => r.id === id ? { ...r, [key]: !currentValue } : r))
      await updateNotificationRecipient(id, {
        [key]: !currentValue
      })
      toast.success("Preferências salvas!")
    } catch (err) {
      // Rollback
      setRecipients(prev => prev.map(r => r.id === id ? { ...r, [key]: currentValue } : r))
      toast.error("Erro ao atualizar preferências")
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    } catch {
      return dateString
    }
  }

  // Filtering logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      log.recipientEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.recipientName && log.recipientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      log.subject.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "SUCCESS" && log.status === "SUCCESS") ||
      (statusFilter === "FAILED" && log.status === "FAILED")

    return matchesSearch && matchesStatus
  })

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Link href="/settings" className="text-muted-foreground hover:text-slate-800 transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">Central de Notificações</h1>
          </div>
          <p className="text-muted-foreground mt-1">Gerencie a equipe que recebe alertas e audite o histórico de e-mails enviados.</p>
        </div>

        {/* Tabs System */}
        <Tabs defaultValue="recipients" className="w-full">
          <TabsList className="bg-slate-100 p-1 rounded-xl">
            <TabsTrigger value="recipients" className="rounded-lg font-bold text-xs">Destinatários</TabsTrigger>
            <TabsTrigger value="logs" className="rounded-lg font-bold text-xs">Histórico de Disparos</TabsTrigger>
          </TabsList>

          {/* Recipients Tab */}
          <TabsContent value="recipients" className="mt-6 space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Form Section */}
              <div className="lg:col-span-1">
                <Card className="shadow-sm border-slate-100">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <Plus className="w-4 h-4 text-emerald-600" />
                      Adicionar Destinatário
                    </CardTitle>
                    <CardDescription className="text-xs">Cadastre um e-mail para receber alertas do sistema</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddRecipient} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="recName" className="text-xs font-bold text-slate-600">Nome completo</Label>
                        <Input
                          id="recName"
                          placeholder="Ex: João da Silva"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          className="h-9 text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="recEmail" className="text-xs font-bold text-slate-600">E-mail</Label>
                        <Input
                          id="recEmail"
                          type="email"
                          placeholder="Ex: joao@empresa.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="h-9 text-xs"
                        />
                      </div>

                      <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="text-xs font-bold text-slate-700">Vencimento de Documentos</Label>
                            <p className="text-[10px] text-muted-foreground">Alertas de ASO, treinamentos, etc.</p>
                          </div>
                          <Switch checked={docAlerts} onCheckedChange={setDocAlerts} />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="text-xs font-bold text-slate-700">Novo Funcionário</Label>
                            <p className="text-[10px] text-muted-foreground">Alertas quando funcionário for admitido.</p>
                          </div>
                          <Switch checked={empAlerts} onCheckedChange={setEmpAlerts} />
                        </div>
                      </div>

                      <Button type="submit" disabled={submitting} className="w-full h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 cursor-pointer">
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                        Adicionar
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-sm font-bold text-slate-800">Equipe de Destinatários</h3>
                {loadingRecipients ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mr-2" />
                    <span className="text-xs text-slate-500 font-medium">Carregando destinatários...</span>
                  </div>
                ) : recipients.length === 0 ? (
                  <div className="border border-dashed border-slate-200 rounded-2xl p-10 text-center bg-slate-50/20">
                    <Mail className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <h4 className="text-sm font-bold text-slate-700">Nenhum destinatário cadastrado</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Cadastre e-mails da sua equipe no formulário lateral para que recebam alertas do sistema.</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {recipients.map((rec) => (
                      <Card key={rec.id} className="shadow-sm p-0 border-slate-100 hover:border-slate-200 transition-all duration-200">
                        <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                          <div className="flex justify-between items-start gap-2">
                            <div className="space-y-0.5 truncate">
                              <h4 className="text-xs font-bold text-slate-800 truncate" title={rec.name}>{rec.name}</h4>
                              <p className="text-[10px] text-muted-foreground truncate" title={rec.email}>{rec.email}</p>
                            </div>
                            <Button
                              variant="ghost"
                              onClick={() => handleDeleteRecipient(rec.id)}
                              className="size-7 p-0 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700 rounded-lg shrink-0 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>

                          {/* Preferences toggles */}
                          <div className="pt-3 border-t border-slate-50 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-500">Alertas de Vencimento</span>
                              <Switch
                                checked={rec.documentExpirationAlerts}
                                onCheckedChange={() => handleTogglePreference(rec.id, "documentExpirationAlerts", rec.documentExpirationAlerts)}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-500">Novo Funcionário</span>
                              <Switch
                                checked={rec.newEmployeeAlerts}
                                onCheckedChange={() => handleTogglePreference(rec.id, "newEmployeeAlerts", rec.newEmployeeAlerts)}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="mt-6 space-y-4">
            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 border border-slate-100 rounded-2xl shadow-sm">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Pesquisar por assunto ou e-mail..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === "ALL" ? "default" : "outline"}
                  onClick={() => setStatusFilter("ALL")}
                  className={`h-9 px-3 text-xs font-bold cursor-pointer ${statusFilter === "ALL" ? "bg-slate-800 text-white" : ""}`}
                >
                  Todos
                </Button>
                <Button
                  variant={statusFilter === "SUCCESS" ? "default" : "outline"}
                  onClick={() => setStatusFilter("SUCCESS")}
                  className={`h-9 px-3 text-xs font-bold cursor-pointer ${statusFilter === "SUCCESS" ? "bg-emerald-600 text-white hover:bg-emerald-700" : "text-emerald-600 hover:text-emerald-700"}`}
                >
                  Sucesso
                </Button>
                <Button
                  variant={statusFilter === "FAILED" ? "default" : "outline"}
                  onClick={() => setStatusFilter("FAILED")}
                  className={`h-9 px-3 text-xs font-bold cursor-pointer ${statusFilter === "FAILED" ? "bg-red-600 text-white hover:bg-red-700" : "text-red-600 hover:text-red-700"}`}
                >
                  Falhas
                </Button>
              </div>
            </div>

            {/* Logs List */}
            {loadingLogs ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mr-2" />
                <span className="text-xs text-slate-500 font-medium">Carregando histórico...</span>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="border border-dashed border-slate-200 rounded-2xl p-10 text-center bg-slate-50/20">
                <Mail className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-700">Nenhum e-mail registrado</h4>
                <p className="text-xs text-slate-400 mt-1">E-mails enviados pelo sistema aparecerão registrados neste log.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLogs.map((log) => (
                  <Card key={log.id} className={`shadow-sm border-slate-100 hover:shadow-md transition-all duration-200 ${log.status === "FAILED" ? "bg-red-50/5" : ""}`}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center flex-wrap gap-2">
                            <Badge className={`text-[9px] font-bold ${log.status === "SUCCESS" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "bg-red-100 text-red-700 hover:bg-red-100"}`}>
                              {log.status === "SUCCESS" ? "SUCESSO" : "FALHA"}
                            </Badge>
                            <span className="text-xs font-bold text-slate-700">{log.subject}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold">
                            <span>Para:</span>
                            <span className="text-slate-600">{log.recipientName ? `${log.recipientName} (${log.recipientEmail})` : log.recipientEmail}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end shrink-0">
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(log.sentAt)}
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => setSelectedLog(log)}
                            className="h-7 px-2.5 text-[10px] font-bold flex items-center gap-1 border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            Visualizar
                          </Button>
                        </div>
                      </div>

                      {/* Error details if failed */}
                      {log.status === "FAILED" && log.error && (
                        <div className="mt-3 p-3 bg-red-50/50 border border-red-100 rounded-xl flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <p className="text-[10px] font-bold text-red-700">Erro de Envio:</p>
                            <p className="text-[10px] text-red-600 font-medium font-mono">{log.error}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Email Body Preview Dialog */}
      {selectedLog && (
        <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
          <DialogContent className="max-w-2xl w-full p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-800 truncate" title={selectedLog.subject}>
                {selectedLog.subject}
              </DialogTitle>
              <DialogDescription className="text-xs flex flex-wrap gap-x-3 gap-y-1 pt-1 font-semibold">
                <span><strong>Para:</strong> {selectedLog.recipientName ? `${selectedLog.recipientName} (${selectedLog.recipientEmail})` : selectedLog.recipientEmail}</span>
                <span>•</span>
                <span><strong>Enviado em:</strong> {formatDate(selectedLog.sentAt)}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 border border-slate-100 rounded-2xl overflow-hidden shadow-inner bg-slate-50 p-2">
              <iframe
                title="Email Preview"
                srcDoc={selectedLog.body}
                className="w-full h-[400px] border-0 bg-white rounded-xl"
              />
            </div>

            <div className="mt-4 flex justify-end">
              <Button onClick={() => setSelectedLog(null)} className="h-9 px-4 text-xs font-bold bg-slate-800 hover:bg-slate-900 cursor-pointer">
                Fechar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  )
}
