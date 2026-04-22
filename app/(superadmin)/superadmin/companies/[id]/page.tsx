"use client"

import { getDaysRemaining } from "@/lib/utils"

import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/status-badge"
import { ArrowLeft, Building2, Mail, MapPin, Calendar, Ban, Plus, Trash2, Loader2, User, Building, FileText, Upload, Eye, Phone, Users, Activity, Pencil, Save } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  getCompanyData,
  getCompanyRequiredDocuments,
  addCompanyRequiredDocument,
  deleteCompanyRequiredDocument,
  getCompanyDocuments,
  toggleCompanyStandardDocument,
  getEmployees,
  updateCompanyRequiredDocument,
  updateCompanyStandardDocument,
  toggleCompanyRequiredDocument
} from "@/actions/requests"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { DOCUMENTS_PT_BR, TRAININGS_PT_BR } from "@/lib/constants/documents"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
  { type: 'PGR_CPFL', label: 'PGR CPFL' },
  { type: 'PCMSO_CPFL', label: 'PCMSO CPFL' },
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

export default function CompanyDetailsPage() {
  const params = useParams()
  const companyId = params.id as string
  const [company, setCompany] = useState<any>(null)
  const [requirements, setRequirements] = useState<any[]>([])
  const [companyDocs, setCompanyDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState("")
  const [newTarget, setNewTarget] = useState<"EMPLOYEE_DOC" | "EMPLOYEE_TRAINING" | "COMPANY_DOC" | "COMPANY_LABOR">("EMPLOYEE_DOC")
  const [newValidity, setNewValidity] = useState("")
  const [employeesCount, setEmployeesCount] = useState(0)

  useEffect(() => {
    if (!companyId) return

    const fetchData = async () => {
      try {
        const [companyData, reqs, docs, emps] = await Promise.all([
          getCompanyData(companyId),
          getCompanyRequiredDocuments(companyId),
          getCompanyDocuments(companyId),
          getEmployees(companyId)
        ])
        setCompany(companyData)
        setRequirements(reqs)
        setCompanyDocs(docs)
        setEmployeesCount(emps.length)
      } catch (error) {
        console.error(error)
        toast.error("Erro ao carregar dados da empresa")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [companyId])

  const handleAddRequirement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName) return

    setAdding(true)
    try {
      const res = await addCompanyRequiredDocument({
        companyId,
        name: newName,
        target: newTarget,
        validityDays: newValidity
      })
      setRequirements(prev => [res, ...prev])
      setNewName("")
      setNewValidity("")
      toast.success("Documento obrigatório adicionado")
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Erro ao adicionar documento")
    } finally {
      setAdding(false)
    }
  }

  const handleDeleteRequirement = async (id: string) => {
    try {
      await deleteCompanyRequiredDocument(id)
      setRequirements(prev => prev.filter(r => r.id !== id))
      toast.success("Documento obrigatório removido")
    } catch (error) {
      toast.error("Erro ao remover documento")
    }
  }

  const handleToggleStandardDoc = async (type: string, currentStatus: boolean) => {
    try {
      const action = currentStatus ? 'disable' : 'enable'
      await toggleCompanyStandardDocument({
        companyId,
        type,
        action
      })

      setCompany((prev: any) => ({
        ...prev,
        disabledDocuments: action === 'disable'
          ? [...(prev.disabledDocuments || []), type]
          : (prev.disabledDocuments || []).filter((t: string) => t !== type)
      }))

      toast.success(`Documento ${action === 'disable' ? 'desabilitado' : 'habilitado'} com sucesso`)
    } catch (error) {
      toast.error("Erro ao atualizar configuração do documento")
    }
  }

  const handleToggleRequirement = async (requirementId: string, currentStatus: boolean) => {
    try {
      const isEnabled = !currentStatus
      await toggleCompanyRequiredDocument({
        companyId: company.id,
        requirementId,
        isEnabled
      })

      setRequirements(prev => prev.map(r => r.id === requirementId ? { ...r, isEnabled } : r))
      toast.success(`Documento ${isEnabled ? 'habilitado' : 'desabilitado'} com sucesso`)
    } catch (error) {
      toast.error("Erro ao atualizar status do documento")
    }
  }

  const handleUpdateRequirement = async (requirementId: string, name: string, target: string, validityDays: number | null) => {
    try {
      const updated = await updateCompanyRequiredDocument({
        requirementId,
        name,
        validityDays: validityDays || 0,
        target: target as any
      })

      setRequirements(prev => prev.map(r => r.id === requirementId ? updated : r))
      toast.success("Documento atualizado com sucesso")
    } catch (error) {
      toast.error("Erro ao atualizar documento")
    }
  }

  const handleUpdateStandardDoc = async (type: string, name: string, validityDays: number | null) => {
    try {
      await updateCompanyStandardDocument({
        companyId,
        type,
        name,
        validityDays: validityDays || 0
      })

      setCompany((prev: any) => ({
        ...prev,
        standardDocumentLabels: {
          ...(prev.standardDocumentLabels || {}),
          [type]: name
        },
        standardDocumentValidity: {
          ...(prev.standardDocumentValidity || {}),
          [type]: validityDays || 0
        }
      }))

      toast.success("Configuração do documento atualizada")
    } catch (error) {
      toast.error("Erro ao atualizar documento")
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    )
  }

  if (!company) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold">Empresa não encontrada</h2>
          <Link href="/superadmin/companies" className="text-primary hover:underline mt-4 block">
            Voltar para lista
          </Link>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/superadmin/companies">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">{company.name}</h1>
            <p className="text-muted-foreground mt-1">Detalhes da Empresa</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center pb-4">
                <div className="w-full h-full rounded-lg bg-primary/10 p-10 flex items-center justify-center overflow-hidden border">
                  {company.imageUrl ? (
                    <img src={company.imageUrl} alt={company.name} className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-12 h-12 text-primary" />
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <StatusBadge status={company.status?.toLowerCase()} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">CNPJ</p>
                  <p className="text-sm font-medium">{company.cnpj}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Responsável</p>
                  <p className="text-sm font-medium">{company.responsible}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Contatos e Localização</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">E-mail</p>
                    <p className="text-sm font-semibold text-slate-700">{company.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100">
                    <Phone className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Telefone</p>
                    <p className="text-sm font-semibold text-slate-700">{company.phone || "Não informado"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 border border-amber-100">
                    <MapPin className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Localização</p>
                    <p className="text-sm font-semibold text-slate-700 truncate">{company.city}, {company.state}</p>
                    <p className="text-[11px] text-slate-500 truncate">{company.address}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0 border border-violet-100">
                    <Users className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total de Funcionários</p>
                    <div className="flex items-baseline gap-1">
                      <p className="text-sm font-semibold text-slate-700">{employeesCount}</p>
                      <p className="text-[10px] text-slate-400 font-medium">cadastrados</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0 border border-rose-100">
                    <FileText className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Documentos Extras</p>
                    <div className="flex items-baseline gap-1">
                      <p className="text-sm font-semibold text-slate-700">{requirements.length}</p>
                      <p className="text-[10px] text-slate-400 font-medium">requisitos</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                    <Calendar className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Criada em</p>
                    <p className="text-sm font-semibold text-slate-700">
                      {new Date(company.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Tabs defaultValue="standard-docs" className="w-full">
            <TabsList className="w-full justify-start overflow-x-auto space-x-2 bg-slate-100 rounded-xl p-1 h-12">
              <TabsTrigger value="standard-docs" className="rounded-lg font-bold px-6">Documentos Padrão</TabsTrigger>
              <TabsTrigger value="employee-docs" className="rounded-lg font-bold px-6">Documentos do Funcionário</TabsTrigger>
              <TabsTrigger value="custom-docs" className="rounded-lg font-bold px-6">Documentos Customizados</TabsTrigger>
              <TabsTrigger value="uploaded-docs" className="rounded-lg font-bold px-6">Documentos Enviados</TabsTrigger>
            </TabsList>

            <TabsContent value="standard-docs" className="mt-6 space-y-6 w-full overflow-hidden">
              <Card className="border-emerald-100 shadow-md">
                <CardHeader className="bg-emerald-50/50">
                  <CardTitle className="text-emerald-900 flex items-center gap-2">
                    <Building className="w-5 h-5" /> Configuração de Documentos Padrão
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h3 className="font-bold text-slate-700 border-b pb-2">Documentos da Empresa</h3>
                      {COMPANY_DOCS.map(doc => (
                        <StandardDocItem
                          key={doc.type}
                          doc={doc}
                          company={company}
                          onToggle={handleToggleStandardDoc}
                          onSetValidity={handleUpdateStandardDoc}
                        />
                      ))}
                    </div>
                    <div className="space-y-4">
                      <h3 className="font-bold text-slate-700 border-b pb-2">Documentos Trabalhistas</h3>
                      {LABOR_DOCS.map(doc => (
                        <StandardDocItem
                          key={doc.type}
                          doc={doc}
                          company={company}
                          onToggle={handleToggleStandardDoc}
                          onSetValidity={handleUpdateStandardDoc}
                        />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="employee-docs" className="mt-6 space-y-6 w-full overflow-hidden">
              <Card className="border-emerald-100 shadow-md">
                <CardHeader className="bg-emerald-50/50">
                  <CardTitle className="text-emerald-900 flex items-center gap-2">
                    <User className="w-5 h-5" /> Configuração de Documentos e Treinamentos do Funcionário
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h3 className="font-bold text-slate-700 border-b pb-2">Documentos do Funcionário</h3>
                      {Object.entries(DOCUMENTS_PT_BR).map(([type, label]) => (
                        <StandardDocItem
                          key={type}
                          doc={{ type, label }}
                          company={company}
                          onToggle={handleToggleStandardDoc}
                          onSetValidity={handleUpdateStandardDoc}
                        />
                      ))}
                    </div>
                    <div className="space-y-4">
                      <h3 className="font-bold text-slate-700 border-b pb-2">Treinamentos de Segurança</h3>
                      {Object.entries(TRAININGS_PT_BR).map(([type, label]) => (
                        <StandardDocItem
                          key={type}
                          doc={{ type, label }}
                          company={company}
                          onToggle={handleToggleStandardDoc}
                          onSetValidity={handleUpdateStandardDoc}
                        />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="custom-docs" className="mt-6 w-full overflow-hidden">
              <Card className="border-emerald-100 shadow-md">
                <CardHeader className="bg-emerald-50/50">
                  <CardTitle className="flex items-center gap-2 text-emerald-900">
                    <FileText className="w-5 h-5" />
                    Documentos Obrigatórios Adicionais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6 px-3 md:px-6">
                  <form onSubmit={handleAddRequirement} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border">
                    <div className="space-y-1">
                      <Label>Nome do Documento</Label>
                      <Input
                        placeholder="Ex: Alvará de Funcionamento"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Destino (Público-alvo)</Label>
                      <Select
                        value={newTarget}
                        onValueChange={(val: any) => setNewTarget(val)}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Selecione o destino" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EMPLOYEE_DOC">Documento do Funcionário</SelectItem>
                          <SelectItem value="EMPLOYEE_TRAINING">Treinamento do Funcionário</SelectItem>
                          <SelectItem value="COMPANY_DOC">Documento da Empresa</SelectItem>
                          <SelectItem value="COMPANY_LABOR">Documento Trabalhista</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label>Validade (dias)</Label>
                      <Input
                        type="number"
                        disabled={newTarget === "EMPLOYEE_DOC" || newTarget === "EMPLOYEE_TRAINING"}
                        placeholder="Ex: 365"
                        value={newValidity}
                        onChange={(e) => setNewValidity(e.target.value)}
                      />
                    </div>

                    <div className="flex items-end">
                      <Button disabled={adding} type="submit" className="w-full gap-2">
                        {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Adicionar
                      </Button>
                    </div>
                  </form>

                  <div className="space-y-8">
                    {[
                      { title: "Documentos de Empresa", target: "COMPANY_DOC" },
                      { title: "Documentos Trabalhistas", target: "COMPANY_LABOR" },
                      { title: "Documentos do Funcionário", target: "EMPLOYEE_DOC" },
                      { title: "Treinamentos do Funcionário", target: "EMPLOYEE_TRAINING" },
                    ].map((section) => {
                      const sectionReqs = requirements.filter(r => r.target === section.target);
                      return (
                        <div key={section.target} className="space-y-3">
                          <h3 className="font-bold text-slate-700 flex items-center gap-2 px-1">
                            <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                            {section.title}
                            <Badge variant="outline" className="ml-auto bg-white">{sectionReqs.length}</Badge>
                          </h3>
                          <div className="rounded-xl border shadow-sm overflow-hidden bg-white">
                            <Table>
                              <TableHeader className="bg-slate-50/50">
                                <TableRow>
                                  <TableHead className="py-3">Nome do Documento</TableHead>
                                  {section.target !== 'EMPLOYEE_DOC' && section.target !== 'EMPLOYEE_TRAINING' && (
                                    <TableHead className="text-center py-3">Validade (dias)</TableHead>
                                  )}
                                  <TableHead className="text-center py-3">Atividade</TableHead>
                                  <TableHead className="text-center py-3">Criação</TableHead>
                                  <TableHead className="text-right py-3 pr-6">Ações</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {sectionReqs.length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic h-24">
                                      Nenhum requisito cadastrado nesta categoria.
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  sectionReqs.map((req) => (
                                    <TableRow key={req.id} className="hover:bg-slate-50/30">
                                      <TableCell className="font-medium text-slate-700 py-3">{req.name}</TableCell>
                                      {section.target !== 'EMPLOYEE_DOC' && section.target !== 'EMPLOYEE_TRAINING' && (
                                        <TableCell className="text-center font-mono py-3">
                                          {req.validityDays || "-"}
                                        </TableCell>
                                      )}
                                      <TableCell className="text-center py-3">
                                        <Switch
                                          checked={req.isEnabled !== false}
                                          onCheckedChange={() => handleToggleRequirement(req.id, req.isEnabled !== false)}
                                          className="scale-90"
                                        />
                                      </TableCell>
                                      <TableCell className="text-center text-slate-500 text-xs py-3">
                                        {new Date(req.createdAt).toLocaleDateString("pt-BR")}
                                      </TableCell>
                                      <TableCell className="text-right py-3 pr-6">
                                        <div className="flex justify-end gap-1">
                                          <EditRequirementModal
                                            requirement={req}
                                            onUpdate={handleUpdateRequirement}
                                          />
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => handleDeleteRequirement(req.id)}
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="uploaded-docs" className="mt-6 w-full overflow-hidden">
              <Card className="border-emerald-100 shadow-md">
                <CardHeader className="bg-emerald-50/50">
                  <CardTitle className="text-emerald-900 flex items-center gap-2">
                    <Upload className="w-5 h-5" /> Documentos Enviados pela Empresa
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 px-0">
                  <div className="px-6 pb-4">
                    <p className="text-sm text-muted-foreground">Estes são os arquivos que a empresa já subiu no sistema.</p>
                  </div>
                  <div className="border-t overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="px-6">Documento</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead className="text-center">Data de Emissão</TableHead>
                          <TableHead className="text-center">Dias para vencer</TableHead>
                          <TableHead className="text-right px-6">Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="text-xs md:text-sm">
                        {companyDocs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic">
                              Nenhum documento enviado até o momento.
                            </TableCell>
                          </TableRow>
                        ) : (
                          companyDocs.map((doc) => (
                            <TableRow key={doc.id} className="hover:bg-slate-50/50">
                              <TableCell className="px-6 font-bold text-slate-700 min-w-[120px] max-w-[200px] md:truncate">
                                {doc.type === 'CUSTOM' ? doc.name : (COMPANY_DOCS.find(d => d.type === doc.type)?.label || LABOR_DOCS.find(d => d.type === doc.type)?.label || doc.type)}
                              </TableCell>
                              <TableCell className="text-center whitespace-nowrap">
                                <Badge
                                  className={`rounded-lg py-0.5 px-2 text-[10px] md:text-xs ${doc.status === "APPROVED"
                                    ? "bg-emerald-50 text-emerald-600 border-none"
                                    : doc.status === "PENDING"
                                      ? "bg-amber-50 text-amber-600 border-none"
                                      : "bg-red-50 text-red-600 border-none"
                                    }`}
                                >
                                  {doc.status === "APPROVED" ? "Aprovado" : doc.status === "PENDING" ? "Pendente" : "Rejeitado"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center text-slate-500 font-medium whitespace-nowrap">
                                {doc.issuedAt ? new Date(doc.issuedAt).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : "---"}
                              </TableCell>
                              <TableCell className="text-center text-slate-500 font-medium whitespace-nowrap">
                                {doc.expiresAt ? getDaysRemaining(doc.expiresAt) : "---"}
                              </TableCell>
                              <TableCell className="text-right px-6">
                                {doc.fileUrl && (
                                  <Link href={doc.fileUrl} target="_blank">
                                    <Button variant="ghost" size="icon" className="size-8 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                                      <Eye className="size-4" />
                                    </Button>
                                  </Link>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  )
}

function StandardDocItem({
  doc,
  company,
  onToggle,
  onSetValidity
}: {
  doc: { type: string, label: string },
  company: any,
  onToggle: (type: string, current: boolean) => void,
  onSetValidity: (type: string, name: string, days: number | null) => void
}) {
  const isEnabled = !company.disabledDocuments?.includes(doc.type);
  const customLabel = company.standardDocumentLabels?.[doc.type] || doc.label;
  const validity = company.standardDocumentValidity?.[doc.type] || 0;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
      <div className="flex flex-col min-w-0 flex-1 mr-4">
        <span className="text-sm font-medium text-slate-600 truncate" title={customLabel}>{customLabel}</span>
        {isEnabled && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Validade: {validity} dias</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {isEnabled && (
          <EditRequirementModal
            requirement={{
              id: doc.type,
              name: customLabel,
              target: "STANDARD",
              validityDays: validity,
              isStandard: true
            }}
            onUpdate={async (id, name, target, days) => onSetValidity(id, name, days)}
          />
        )}
        <Switch
          checked={isEnabled}
          onCheckedChange={() => onToggle(doc.type, isEnabled)}
        />
      </div>
    </div>
  )
}

function EditRequirementModal({
  requirement,
  onUpdate
}: {
  requirement: { id: string, name: string, target: string, validityDays: number | null, isStandard?: boolean },
  onUpdate: (id: string, name: string, target: string, validityDays: number | null) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(requirement.name)
  const [target, setTarget] = useState(requirement.target)
  const [validity, setValidity] = useState(requirement.validityDays?.toString() || "")
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    try {
      await onUpdate(requirement.id, name, target, validity ? parseInt(validity) : null)
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 cursor-pointer"
        onClick={() => setOpen(true)}
      >
        <Pencil className="w-4 h-4" />
      </Button>
      <DialogContent className="max-w-2xl! w-full!">
        <DialogHeader>
          <DialogTitle>Editar {requirement.isStandard ? "Documento Padrão" : "Documento Customizado"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nome do Documento</Label>
            <Input
              id="name"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              placeholder="Ex: Certificado de Brigada"
            />
          </div>
          {!requirement.isStandard && (
            <div className="grid gap-2">
              <Label>Destino (Público-alvo)</Label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Selecione o destino" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMPLOYEE_DOC">Documento do Funcionário</SelectItem>
                  <SelectItem value="EMPLOYEE_TRAINING">Treinamento do Funcionário</SelectItem>
                  <SelectItem value="COMPANY_DOC">Documento da Empresa</SelectItem>
                  <SelectItem value="COMPANY_LABOR">Documento Trabalhista</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {!(target === "EMPLOYEE_DOC" || target === "EMPLOYEE_TRAINING") && (
            <div className="grid gap-2">
              <Label htmlFor="validity">Validade (dias)</Label>
              <Input
                id="validity"
                type="number"
                value={validity}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValidity(e.target.value)}
                placeholder="Ex: 365"
              />
              <p className="text-[10px] text-muted-foreground">Deixe vazio para documentos sem validade definida.</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
