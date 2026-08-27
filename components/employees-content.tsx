"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/status-badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import {
  Plus,
  Search,
  Eye,
  Briefcase,
  IdCard,
  Mail,
  RotateCw,
  FileDown,
  Users,
  Loader2,
  Building2,
  LayoutGrid,
  List,
  ArrowUpDown
} from "lucide-react"
import { useSnapshot } from "valtio"
import { useEmployeesStore } from "@/stores/employees"
import { downloadEmployeeZip, getEmployees } from "@/actions/requests"
import { useCompanyStore } from "@/stores/company"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { useUserStore } from "@/stores/user"

type SortOption = "name-asc" | "name-desc" | "date-desc" | "date-asc"

export function EmployeesContent() {
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("name-asc")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [zipLoadingId, setZipLoadingId] = useState<string | null>(null)
  const useEmployee = useSnapshot(useEmployeesStore)
  const companyStore = useSnapshot(useCompanyStore)
  const userStore = useSnapshot(useUserStore)
  const isSpy = (userStore.user?.role as string) === "ESPIAO"
  const spyPermissions = (userStore.user as any)?.permissions || {}
  const canEditEmployees = !isSpy || (spyPermissions["employees"]?.edit === true)

  // Persist view mode preference in localStorage
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem("employees_view_mode")
      if (savedMode === "grid" || savedMode === "list") {
        setViewMode(savedMode)
      }
    } catch (e) {}
  }, [])

  function handleChangeViewMode(mode: "grid" | "list") {
    setViewMode(mode)
    try {
      localStorage.setItem("employees_view_mode", mode)
    } catch (e) {}
  }

  async function handleDownloadZip(employeeId: string, employeeName: string) {
    setZipLoadingId(employeeId)
    try {
      await downloadEmployeeZip(employeeId, employeeName)
      toast.success("Download Concluído!")
    } catch (error: any) {
      toast.error(error?.message || "Erro ao baixar arquivos")
    } finally {
      setZipLoadingId(null)
    }
  }

  const filteredEmployees = (useEmployee.employees || [])
    .filter((employee) => {
      const matchesStatus = statusFilter === "all" || employee.status === statusFilter
      const matchesSearch =
        employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.cpf.includes(searchQuery)

      return matchesStatus && matchesSearch
    })
    .sort((a, b) => {
      if (sortBy === "name-asc") {
        return (a.name || "").localeCompare(b.name || "", "pt-BR", { sensitivity: "base" })
      }
      if (sortBy === "name-desc") {
        return (b.name || "").localeCompare(a.name || "", "pt-BR", { sensitivity: "base" })
      }
      if (sortBy === "date-desc") {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return timeB - timeA
      }
      if (sortBy === "date-asc") {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return timeA - timeB
      }
      return 0
    })

  useEffect(() => {
    if (companyStore.company_selected?.id) {
      getEmployees(companyStore.company_selected.id)
    }
  }, [companyStore.company_selected?.id])

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">Funcionários</h1>
          <p className="text-slate-500 text-sm lg:text-base font-medium">
            Gerenciamento de efetivo e conformidade documental.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {canEditEmployees ? (
            <Link href={"/employees/mass-creation"} className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto gap-2 cursor-pointer rounded-xl h-11 font-bold border-slate-200 text-slate-600 hover:bg-slate-50">
                <FileDown className="w-4 h-4" />
                Criação em Massa
              </Button>
            </Link>
          ) : (
            <Button disabled variant="outline" className="w-full sm:w-auto gap-2 rounded-xl h-11 font-bold border-slate-200 text-slate-600 opacity-50 cursor-not-allowed">
              <FileDown className="w-4 h-4" />
              Criação em Massa
            </Button>
          )}

          {canEditEmployees ? (
            <Link href={"/add-employee"} className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto gap-2 cursor-pointer text-white rounded-xl shadow-lg shadow-emerald-100 px-6 h-11 font-bold">
                <Plus className="w-4 h-4" />
                Novo Funcionário
              </Button>
            </Link>
          ) : (
            <Button disabled className="w-full sm:w-auto gap-2 text-white rounded-xl px-6 h-11 font-bold opacity-50 cursor-not-allowed">
              <Plus className="w-4 h-4" />
              Novo Funcionário
            </Button>
          )}
        </div>
      </div>

      {/* Filter and View Switcher Bar (Mobile-first) */}
      <Card className="rounded-3xl border-slate-100 shadow-sm bg-white overflow-hidden">
        <CardContent className="p-4 lg:p-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Busque por nome, CPF ou cargo..."
                className="pl-10 h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all text-sm font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Controls: Filter, Sort & View Switcher */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="grid grid-cols-2 gap-2 flex-1 sm:flex-initial">
                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-44 h-11 rounded-xl border-slate-100 bg-slate-50/50 text-xs sm:text-sm font-semibold text-slate-700">
                    <SelectValue placeholder="Filtrar Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                    <SelectItem value="all" className="font-medium">Todos os Registros</SelectItem>
                    <SelectItem value="ACTIVE" className="font-medium text-emerald-600">Ativos</SelectItem>
                    <SelectItem value="TERMINATED" className="font-medium text-red-600">Demitidos</SelectItem>
                  </SelectContent>
                </Select>

                {/* Sort Selector */}
                <Select value={sortBy} onValueChange={(val: SortOption) => setSortBy(val)}>
                  <SelectTrigger className="w-full sm:w-44 h-11 rounded-xl border-slate-100 bg-slate-50/50 text-xs sm:text-sm font-semibold text-slate-700">
                    <div className="flex items-center gap-1.5 truncate">
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <SelectValue placeholder="Organizar" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                    <SelectItem value="name-asc" className="font-medium">A - Z</SelectItem>
                    <SelectItem value="name-desc" className="font-medium">Z - A</SelectItem>
                    <SelectItem value="date-desc" className="font-medium">Mais recente</SelectItem>
                    <SelectItem value="date-asc" className="font-medium">Mais antigo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* View Mode Toggle (Grid vs List) */}
              <div
                className="flex items-center justify-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/60 shrink-0 self-end sm:self-auto w-full sm:w-auto"
                role="group"
                aria-label="Modo de exibição"
              >
                <button
                  type="button"
                  onClick={() => handleChangeViewMode("grid")}
                  className={`flex-1 sm:flex-initial flex items-center justify-center h-9 px-4 sm:px-0 sm:w-9 rounded-lg transition-all cursor-pointer ${
                    viewMode === "grid"
                      ? "bg-white text-emerald-700 shadow-xs font-bold"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                  title="Exibir em Cards"
                  aria-label="Exibir em Cards"
                  aria-pressed={viewMode === "grid"}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleChangeViewMode("list")}
                  className={`flex-1 sm:flex-initial flex items-center justify-center h-9 px-4 sm:px-0 sm:w-9 rounded-lg transition-all cursor-pointer ${
                    viewMode === "list"
                      ? "bg-white text-emerald-700 shadow-xs font-bold"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                  title="Exibir em Lista"
                  aria-label="Exibir em Lista"
                  aria-pressed={viewMode === "list"}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Area: Loading / Empty / Grid / List */}
      {!useEmployee.employees ? (
        // Loading Skeletons
        viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4 lg:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="border-slate-100 bg-white overflow-hidden">
                <CardContent className="p-6 lg:p-8 flex flex-col h-full">
                  <div className="flex items-center gap-4 mb-6">
                    <Skeleton className="w-16 h-16 rounded-3xl shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-y-5 gap-x-4 mb-8">
                    <div className="space-y-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-4 w-28" /></div>
                    <div className="space-y-2"><Skeleton className="h-3 w-20" /><Skeleton className="h-4 w-24" /></div>
                    <div className="space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-4 w-40" /></div>
                    <div className="space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-4 w-32" /></div>
                  </div>
                  <div className="flex gap-3 mt-auto pt-4 border-t border-slate-50">
                    <Skeleton className="flex-1 h-10 rounded-xl" />
                    <Skeleton className="flex-1 h-10 rounded-xl" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="border border-slate-100 rounded-2xl md:rounded-3xl bg-white shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6 space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-4 py-2 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-3 flex-1">
                    <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                    <div className="space-y-1.5 flex-1 max-w-sm">
                      <Skeleton className="h-4 w-44" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-24 rounded-lg hidden sm:block" />
                </div>
              ))}
            </div>
          </div>
        )
      ) : filteredEmployees?.length === 0 ? (
        // Empty State
        <div className="flex flex-col items-center justify-center py-20 bg-white/50 border border-dashed border-slate-200 rounded-[3rem]">
          <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-slate-300" />
          </div>
          <h4 className="text-slate-900 font-bold">Nenhum resultado encontrado</h4>
          <p className="text-slate-400 text-sm mt-1">Tente ajustar seus filtros de busca.</p>
        </div>
      ) : viewMode === "grid" ? (
        // MODE 1: Grid of Cards
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4 lg:gap-6">
          {filteredEmployees.map((employee) => (
            <Card
              key={employee.id}
              className="group hover:shadow-xl hover:shadow-emerald-900/5 transition-all duration-300 rounded-xl p-0 border-slate-100 bg-white overflow-hidden"
            >
              <CardContent className="p-6 lg:p-8 flex flex-col h-full">
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative w-16 h-16 rounded-3xl overflow-hidden bg-slate-50 shrink-0 border border-slate-100 shadow-sm group-hover:scale-105 transition-transform duration-500">
                    <img
                      src={employee.image || "/avatar-placeholder.jpeg"}
                      alt={employee.name}
                      className="object-cover w-full h-full"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 truncate leading-tight group-hover:text-emerald-700 transition-colors">
                      {employee.name}
                    </h3>
                    <div className="mt-2">
                      <StatusBadge status={employee.status} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-5 gap-x-4 mb-8">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Documento</p>
                    <div className="flex items-center gap-1.5 font-bold text-slate-600 text-xs">
                      <IdCard className="w-3.5 h-3.5 text-slate-400" />
                      {employee.cpf}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cargo Atual</p>
                    <div className="flex items-center gap-1.5 font-bold text-slate-600 text-xs truncate">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400 animate-none shrink-0" />
                      <span className="truncate">{employee.position}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">E-mail Operacional</p>
                    <div className="flex items-center gap-1.5 font-bold text-slate-600 text-xs truncate" title={employee.email}>
                      <Mail className="w-3.5 h-3.5 text-slate-400 animate-none shrink-0" />
                      <span className="truncate">{employee.email}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Centro de Custo</p>
                    <div className="flex items-center gap-1.5 font-bold text-slate-600 text-xs truncate" title={employee.costCenter?.name || "Não informado"}>
                      <Building2 className="w-3.5 h-3.5 text-slate-400 animate-none shrink-0" />
                      <span className="truncate">{employee.costCenter?.name || "Não informado"}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-auto pt-4 border-t border-slate-50">
                  <Link href={`/employees/${employee.id}`} className="flex-1">
                    <Button
                      variant="outline"
                      className="w-full gap-2 cursor-pointer rounded-xl h-10 text-xs font-bold border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
                    >
                      <Eye className="w-4 h-4" />
                      Detalhes
                    </Button>
                  </Link>

                  <Button
                    variant="secondary"
                    className="flex-1 gap-2 cursor-pointer rounded-xl h-10 text-xs font-bold bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all"
                    disabled={zipLoadingId === employee.id}
                    onClick={() => handleDownloadZip(employee.id, employee.name)}
                  >
                    {zipLoadingId === employee.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <FileDown className="w-4 h-4" />}
                    Baixar Arquivos
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        // MODE 2: List View (Table / Lista para Mobile e Desktop)
        <div className="border border-slate-100 rounded-2xl md:rounded-3xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[620px] md:min-w-full">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-3.5 sm:px-4 lg:px-6">Funcionário</th>
                  <th className="py-3.5 px-3.5 sm:px-4">Documento</th>
                  <th className="py-3.5 px-3.5 sm:px-4">Cargo</th>
                  <th className="py-3.5 px-3.5 sm:px-4">Centro de Custo</th>
                  <th className="py-3.5 px-3.5 sm:px-4 text-center">Status</th>
                  <th className="py-3.5 px-3.5 sm:px-4 lg:px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredEmployees.map((employee) => (
                  <tr
                    key={employee.id}
                    className="hover:bg-slate-50/60 transition-colors group"
                  >
                    <td className="py-3.5 px-3.5 sm:px-4 lg:px-6">
                      <div className="flex items-center gap-3">
                        <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden bg-slate-50 shrink-0 border border-slate-100 shadow-2xs">
                          <img
                            src={employee.image || "/avatar-placeholder.jpeg"}
                            alt={employee.name}
                            className="object-cover w-full h-full"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate group-hover:text-emerald-700 transition-colors text-sm">
                            {employee.name}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate max-w-[180px] sm:max-w-[220px]" title={employee.email}>
                            {employee.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3.5 sm:px-4 font-semibold text-slate-600 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <IdCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{employee.cpf}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3.5 sm:px-4 text-slate-700 font-medium max-w-[160px] truncate" title={employee.position}>
                      <div className="flex items-center gap-1.5 truncate">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{employee.position}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3.5 sm:px-4 text-slate-600 font-medium max-w-[140px] truncate" title={employee.costCenter?.name || "Não informado"}>
                      <div className="flex items-center gap-1.5 truncate">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{employee.costCenter?.name || "Não informado"}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3.5 sm:px-4 text-center whitespace-nowrap">
                      <StatusBadge status={employee.status} />
                    </td>
                    <td className="py-3.5 px-3.5 sm:px-4 lg:px-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                        <Link href={`/employees/${employee.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 sm:px-3 rounded-lg text-xs font-bold border-slate-200 text-slate-600 hover:bg-slate-50 gap-1.5 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Detalhes</span>
                          </Button>
                        </Link>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-8 px-2.5 sm:px-3 rounded-lg text-xs font-bold bg-slate-50 text-slate-600 hover:bg-slate-100 gap-1.5 cursor-pointer"
                          disabled={zipLoadingId === employee.id}
                          onClick={() => handleDownloadZip(employee.id, employee.name)}
                        >
                          {zipLoadingId === employee.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <FileDown className="w-3.5 h-3.5" />
                          )}
                          <span className="hidden sm:inline">Baixar</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}