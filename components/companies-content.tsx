"use client"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/status-badge"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Ban, CheckCircle, Plus, Upload, Loader2, Building2, Users, ShieldAlert, Pencil } from "lucide-react"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { createCompany, uploadImage, getSuperAdminCompanies, toggleCompanyStatus, updateCompany } from "@/actions/requests"
import { useUserStore } from "@/stores/user"
import { useSnapshot } from "valtio"
import { maskCNPJ, maskPhone } from "@/helpers"

type Company = {
  id: string
  name: string
  imageUrl?: string
  cnpj?: string
  email?: string
  phone?: string
  address?: string
  state?: string
  city?: string
  responsible?: string
  status: "ACTIVE" | "BLOCKED"
  createdAt: string
  _count?: { employees: number }
}

function StatCard({ label, value, color, icon }: { label: string; value: number | string; color: string; icon: React.ReactNode }) {
  return (
    <Card className="rounded-2xl border-slate-100 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl shrink-0 ${color}`}>{icon}</div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-black text-slate-900">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function CompaniesContent() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [toggleLoadingId, setToggleLoadingId] = useState<string | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [editForm, setEditForm] = useState({
    name: '', cnpj: '', email: '', phone: '', address: '', state: '', city: '', responsible: '', image_url: ''
  })
  const [editActionLoading, setEditActionLoading] = useState(false)
  const editFileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useSnapshot(useUserStore)

  const [form, setForm] = useState({
    name: '', cnpj: '', email: '', phone: '', address: '', state: '', city: '', responsible: '', image_url: ''
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchCompanies = async () => {
    try {
      const data = await getSuperAdminCompanies()
      setCompanies(data || [])
    } catch (err) {
      toast.error("Erro ao carregar empresas")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCompanies() }, [])

  const filteredCompanies = companies.filter((company) => {
    const matchesSearch = company.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || company.status.toLowerCase() === statusFilter.toLowerCase()
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: companies.length,
    active: companies.filter((c) => c.status === "ACTIVE").length,
    blocked: companies.filter((c) => c.status === "BLOCKED").length,
    totalEmployees: companies.reduce((acc, c) => acc + (c._count?.employees || 0), 0),
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setActionLoading(true)
      const file = e.target.files[0]
      try {
        const uploaded: any = await uploadImage(file)
        setForm(prev => ({ ...prev, image_url: uploaded.url }))
        toast.success("Logo adicionada com sucesso!")
      } catch (error) {
        toast.error("Erro ao enviar a imagem.")
      } finally {
        setActionLoading(false)
      }
    }
  }

  const handleCreate = async () => {
    if (!form.name || !form.cnpj) {
      toast.warning("Nome e CNPJ são obrigatórios.")
      return
    }
    setActionLoading(true)
    try {
      await createCompany({ ...form, userId: user!.id })
      toast.success("Empresa criada com sucesso!")
      setDialogOpen(false)
      fetchCompanies()
      setForm({ name: '', cnpj: '', email: '', phone: '', address: '', state: '', city: '', responsible: '', image_url: '' })
    } catch (error) {
      toast.error("Erro ao criar a empresa.")
    } finally {
      setActionLoading(false)
    }
  }

  const handleToggle = async (company: Company) => {
    setToggleLoadingId(company.id)
    const action = company.status === "ACTIVE" ? "block" : "unblock"
    try {
      await toggleCompanyStatus(company.id, action)
      toast.success(action === "block" ? "Empresa bloqueada." : "Empresa desbloqueada!")
      fetchCompanies()
    } catch (error) {
      toast.error("Erro ao atualizar status da empresa.")
    } finally {
      setToggleLoadingId(null)
    }
  }

  const handleEditOpen = (company: Company) => {
    setEditingCompany(company)
    setEditForm({
      name: company.name || '',
      cnpj: company.cnpj || '',
      email: company.email || '',
      phone: company.phone || '',
      address: company.address || '',
      state: company.state || '',
      city: company.city || '',
      responsible: company.responsible || '',
      image_url: company.imageUrl || '',
    })
    setEditDialogOpen(true)
  }

  const handleEditFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setEditActionLoading(true)
      try {
        const uploaded: any = await uploadImage(e.target.files[0])
        setEditForm(prev => ({ ...prev, image_url: uploaded.url }))
        toast.success("Logo atualizada com sucesso!")
      } catch {
        toast.error("Erro ao enviar a imagem.")
      } finally {
        setEditActionLoading(false)
      }
    }
  }

  const handleUpdate = async () => {
    if (!editForm.name || !editingCompany) return
    setEditActionLoading(true)
    try {
      await updateCompany({
        companyId: editingCompany.id,
        name: editForm.name,
        cnpj: editForm.cnpj,
        email: editForm.email,
        phone: editForm.phone,
        address: editForm.address,
        state: editForm.state,
        city: editForm.city,
        responsible: editForm.responsible,
        imageUrl: editForm.image_url,
      })
      toast.success("Empresa atualizada com sucesso!")
      setEditDialogOpen(false)
      fetchCompanies()
    } catch {
      toast.error("Erro ao atualizar a empresa.")
    } finally {
      setEditActionLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">Empresas</h1>
          <p className="text-slate-500 mt-1">Gerencie todas as empresas cadastradas no sistema.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 rounded-xl h-11 px-5 font-bold shrink-0 cursor-pointer">
              <Plus className="w-5 h-5" />
              Nova Empresa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl! max-h-[90vh] overflow-y-auto rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Cadastrar Nova Empresa</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="md:col-span-2 flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                {form.image_url ? (
                  <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-slate-200">
                    <img src={form.image_url} alt="Logo" className="w-full h-full object-cover" />
                    <button
                      onClick={(e) => { e.stopPropagation(); setForm(prev => ({ ...prev, image_url: '' })) }}
                      className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-sm font-bold"
                    >
                      Trocar
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-3 bg-white rounded-xl shadow-sm">
                      <Upload className="w-6 h-6 text-emerald-600" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">Clique para enviar o logotipo</p>
                  </div>
                )}
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
              </div>

              {[
                { id: "name", label: "Nome da Empresa", placeholder: "Ex: Acme Corp", key: "name" },
                { id: "cnpj", label: "CNPJ", placeholder: "00.000.000/0000-00", key: "cnpj" },
                { id: "email", label: "E-mail", placeholder: "contato@empresa.com", key: "email", type: "email" },
                { id: "phone", label: "Telefone", placeholder: "(00) 00000-0000", key: "phone" },
                { id: "responsible", label: "Responsável", placeholder: "Nome do responsável", key: "responsible" },
                { id: "address", label: "Endereço", placeholder: "Rua, Número, Bairro", key: "address" },
                { id: "city", label: "Cidade", placeholder: "Cidade", key: "city" },
                { id: "state", label: "Estado (UF)", placeholder: "Ex: SP", key: "state" },
              ].map(({ id, label, placeholder, key, type }) => (
                <div key={id} className="space-y-2">
                  <Label htmlFor={id}>{label}</Label>
                  <Input
                    id={id}
                    type={type || "text"}
                    placeholder={placeholder}
                    value={id === "cnpj" ? maskCNPJ((form as any)[key]) : id === "phone" ? maskPhone((form as any)[key]) : (form as any)[key]}
                    onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 mt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={actionLoading} className="rounded-xl cursor-pointer">Cancelar</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[140px] rounded-xl cursor-pointer" onClick={handleCreate} disabled={actionLoading}>
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cadastrar Empresa"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {loading ? Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="rounded-2xl border-slate-100"><CardContent className="p-5"><Skeleton className="h-14 w-full" /></CardContent></Card>
        )) : <>
          <StatCard label="Total" value={stats.total} color="bg-slate-50" icon={<Building2 className="w-5 h-5 text-slate-600" />} />
          <StatCard label="Ativas" value={stats.active} color="bg-emerald-50" icon={<CheckCircle className="w-5 h-5 text-emerald-600" />} />
          <StatCard label="Bloqueadas" value={stats.blocked} color="bg-red-50" icon={<ShieldAlert className="w-5 h-5 text-red-600" />} />
          <StatCard label="Funcionários" value={stats.totalEmployees} color="bg-blue-50" icon={<Users className="w-5 h-5 text-blue-600" />} />
        </>}
      </div>

      <Card className="rounded-2xl border-slate-100 shadow-sm">
        <CardContent className="p-4 lg:p-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Pesquisar empresas..."
                className="pl-10 rounded-xl border-slate-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48 rounded-xl border-slate-200">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="active">Ativas</SelectItem>
                <SelectItem value="blocked">Bloqueadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="pl-6 font-bold text-slate-500">Empresa</TableHead>
                <TableHead className="font-bold text-slate-500">Status</TableHead>
                <TableHead className="font-bold text-slate-500 hidden sm:table-cell">Funcionários</TableHead>
                <TableHead className="font-bold text-slate-500 hidden md:table-cell">Criado em</TableHead>
                <TableHead className="text-right pr-6 font-bold text-slate-500">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCompanies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2">
                      <Building2 className="w-8 h-8 text-slate-300" />
                      <p className="text-slate-500 font-medium">Nenhuma empresa encontrada</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCompanies.map((company) => (
                  <TableRow key={company.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="pl-6 font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl border border-slate-100 overflow-hidden shrink-0 bg-slate-50">
                          <img src={company.imageUrl || "/placeholder-company.png"} alt={company.name} className="w-full h-full object-cover" />
                        </div>
                        <span className="font-semibold text-slate-800 truncate max-w-[160px] lg:max-w-none">{company.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={company.status.toLowerCase()} />
                    </TableCell>
                    <TableCell className="text-slate-500 hidden sm:table-cell">
                      {company._count?.employees || 0}
                    </TableCell>
                    <TableCell className="text-slate-500 hidden md:table-cell">
                      {new Date(company.createdAt).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditOpen(company)}
                          className="gap-1.5 rounded-xl text-xs font-bold cursor-pointer text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Editar
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={toggleLoadingId === company.id}
                              className={`gap-1.5 rounded-xl text-xs font-bold cursor-pointer ${company.status === "ACTIVE" ? "text-red-600 hover:bg-red-50 hover:text-red-700" : "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"}`}
                            >
                              {toggleLoadingId === company.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : company.status === "ACTIVE" ? (
                                <><Ban className="w-3.5 h-3.5" /> Bloquear</>
                              ) : (
                                <><CheckCircle className="w-3.5 h-3.5" /> Desbloquear</>
                              )}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="rounded-2xl max-w-sm">
                            <DialogHeader>
                              <DialogTitle>{company.status === "ACTIVE" ? "Bloquear empresa" : "Desbloquear empresa"}</DialogTitle>
                              <DialogDescription>
                                {company.status === "ACTIVE"
                                  ? `Tem certeza que deseja bloquear "${company.name}"? Os usuários não conseguirão acessar o sistema.`
                                  : `Tem certeza que deseja desbloquear "${company.name}"?`}
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="gap-2">
                              <DialogClose asChild>
                                <Button variant="outline" className="rounded-xl cursor-pointer">Cancelar</Button>
                              </DialogClose>
                              <DialogClose asChild>
                                <Button
                                  onClick={() => handleToggle(company)}
                                  className={`rounded-xl cursor-pointer ${company.status === "ACTIVE" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white"}`}
                                >
                                  {company.status === "ACTIVE" ? "Sim, bloquear" : "Sim, desbloquear"}
                                </Button>
                              </DialogClose>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Edit Company Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl! max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Editar Empresa</DialogTitle>
            <DialogDescription>Atualize os dados de <strong>{editingCompany?.name}</strong>.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div
              className="md:col-span-2 flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 relative group cursor-pointer"
              onClick={() => editFileInputRef.current?.click()}
            >
              {editForm.image_url ? (
                <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-slate-200">
                  <img src={editForm.image_url} alt="Logo" className="w-full h-full object-cover" />
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditForm(prev => ({ ...prev, image_url: '' })) }}
                    className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-sm font-bold"
                  >
                    Trocar
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="p-3 bg-white rounded-xl shadow-sm">
                    <Upload className="w-6 h-6 text-emerald-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-500">Clique para enviar o logotipo</p>
                </div>
              )}
              {editActionLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-2xl">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                </div>
              )}
              <input type="file" ref={editFileInputRef} className="hidden" accept="image/*" onChange={handleEditFileChange} />
            </div>

            {[
              { id: "edit-name", label: "Nome da Empresa", placeholder: "Ex: Acme Corp", key: "name" },
              { id: "edit-cnpj", label: "CNPJ", placeholder: "00.000.000/0000-00", key: "cnpj" },
              { id: "edit-email", label: "E-mail", placeholder: "contato@empresa.com", key: "email", type: "email" },
              { id: "edit-phone", label: "Telefone", placeholder: "(00) 00000-0000", key: "phone" },
              { id: "edit-responsible", label: "Responsável", placeholder: "Nome do responsável", key: "responsible" },
              { id: "edit-address", label: "Endereço", placeholder: "Rua, Número, Bairro", key: "address" },
              { id: "edit-city", label: "Cidade", placeholder: "Cidade", key: "city" },
              { id: "edit-state", label: "Estado (UF)", placeholder: "Ex: SP", key: "state" },
            ].map(({ id, label, placeholder, key, type }) => (
              <div key={id} className="space-y-2">
                <Label htmlFor={id}>{label}</Label>
                <Input
                  id={id}
                  type={type || "text"}
                  placeholder={placeholder}
                  value={key === "cnpj" ? maskCNPJ((editForm as any)[key]) : key === "phone" ? maskPhone((editForm as any)[key]) : (editForm as any)[key]}
                  onChange={e => setEditForm(p => ({ ...p, [key]: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 mt-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={editActionLoading} className="rounded-xl cursor-pointer">Cancelar</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[160px] rounded-xl cursor-pointer"
              onClick={handleUpdate}
              disabled={editActionLoading || !editForm.name}
            >
              {editActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar Alterações"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
