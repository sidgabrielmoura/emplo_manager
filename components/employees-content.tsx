"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/status-badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Search, Eye, Briefcase, IdCard, Mail, RotateCw, FileDown, Users, Loader2 } from "lucide-react"
import { useSnapshot } from "valtio"
import { useEmployeesStore } from "@/stores/employees"
import { downloadEmployeeZip, getEmployees } from "@/actions/requests"
import { useCompanyStore } from "@/stores/company"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

export function EmployeesContent() {
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [zipLoadingId, setZipLoadingId] = useState<string | null>(null)
  const useEmployee = useSnapshot(useEmployeesStore)
  const companyStore = useSnapshot(useCompanyStore)

  async function handleDownloadZip(employeeId: string, employeeName: string) {
    setZipLoadingId(employeeId)
    try {
      await downloadEmployeeZip(employeeId, employeeName)
      toast.success("Download iniciado!")
    } catch (error: any) {
      toast.error(error?.message || "Erro ao baixar arquivos")
    } finally {
      setZipLoadingId(null)
    }
  }

  const filteredEmployees = useEmployee.employees?.filter((employee) => {
    const matchesStatus = statusFilter === "all" || employee.status === statusFilter
    const matchesSearch =
      employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.cpf.includes(searchQuery)

    return matchesStatus && matchesSearch
  })

  useEffect(() => {
    getEmployees(companyStore.company_selected?.id || '')
  }, [companyStore.company_selected?.id])

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">Funcionários</h1>
          <p className="text-slate-500 text-sm lg:text-base font-medium">
            Gerenciamento de efetivo e conformidade documental.
          </p>
        </div>
        <Link href={'/add-employee'} className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto gap-2 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-100 px-6 h-11 font-bold">
            <Plus className="w-4 h-4" />
            Novo Funcionário
          </Button>
        </Link>
      </div>

      <Card className="rounded-3xl border-slate-100 shadow-sm bg-white overflow-hidden">
        <CardContent className="p-4 lg:p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Busque por nome, CPF ou cargo..."
                className="pl-10 h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all text-sm font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-56 h-11 rounded-xl border-slate-100 bg-slate-50/50 text-sm font-semibold text-slate-700">
                <SelectValue placeholder="Filtrar Status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                <SelectItem value="all" className="font-medium">Todos os Registros</SelectItem>
                <SelectItem value="ACTIVE" className="font-medium text-emerald-600">Ativos</SelectItem>
                <SelectItem value="TERMINATED" className="font-medium text-red-600">Demitidos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4 lg:gap-6">
        {!useEmployee.employees ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card
              key={i}
              className="border-slate-100 bg-white overflow-hidden"
            >
              <CardContent className="p-6 lg:p-8 flex flex-col h-full">
                <div className="flex items-center gap-4 mb-6">
                  <Skeleton className="w-16 h-16 rounded-3xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-5 gap-x-4 mb-8">
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>

                <div className="flex gap-3 mt-auto pt-4 border-t border-slate-50">
                  <Skeleton className="flex-1 h-10 rounded-xl" />
                  <Skeleton className="flex-1 h-10 rounded-xl" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredEmployees?.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 bg-white/50 border border-dashed border-slate-200 rounded-[3rem]">
            <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-slate-300" />
            </div>
            <h4 className="text-slate-900 font-bold">Nenhum resultado encontrado</h4>
            <p className="text-slate-400 text-sm mt-1">Tente ajustar seus filtros de busca.</p>
          </div>
        ) : (
          filteredEmployees?.map((employee) => (
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
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                      {employee.position}
                    </div>
                  </div>

                  <div className="space-y-1 col-span-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">E-mail Operacional</p>
                    <div className="flex items-center gap-1.5 font-bold text-slate-600 text-xs truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {employee.email}
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
          ))
        )}
      </div>
    </div>
  )
}