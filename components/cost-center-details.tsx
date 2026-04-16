"use client"

import { useEffect, useState } from "react"
import { getCostCenterDetails } from "@/actions/requests"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Search, MapPin, Users, Building2, User, Eye, Loader2 } from "lucide-react"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "./status-badge"

interface CostCenterDetailsProps {
  id: string
}

export function CostCenterDetails({ id }: CostCenterDetailsProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    getCostCenterDetails(id)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const filteredEmployees = data?.employees?.filter((emp: any) =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.position.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden bg-white">
          <CardHeader className="p-8">
            <Skeleton className="h-10 w-full rounded-2xl" />
          </CardHeader>
          <CardContent className="p-8 pt-0 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) return <div>Erro ao carregar centro de custo.</div>

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <Link href="/cost-centers">
            <Button variant="outline" size="icon" className="size-12 rounded-2xl border-slate-200 hover:bg-slate-50 transition-all cursor-pointer">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">{data.name}</h1>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 px-3 py-1 rounded-full text-xs font-bold pointer-events-none">
                {data._count?.employees || 0} Colaboradores
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-1 text-slate-500 font-bold text-sm uppercase tracking-wider">
              <MapPin className="w-4 h-4 text-emerald-500" />
              {data.city ? `${data.city}${data.state ? `, ${data.state}` : ''}` : "Local não definido"}
            </div>
          </div>
        </div>

        <Link href="/employees">
          <Button className="w-full sm:w-auto gap-2 cursor-pointer bg-slate-900 hover:bg-slate-800 text-white rounded-2xl px-6 h-12 font-bold shadow-xl shadow-slate-200 transition-all">
            <Users className="w-4 h-4" />
            Gerenciar Equipe
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-3 p-0 rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden bg-white">
          <CardHeader className="py-10 border-b border-slate-50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <CardTitle className="text-xl font-black text-slate-900">Colaboradores Alocados</CardTitle>
                <p className="text-slate-400 text-xs font-black mt-1 uppercase tracking-widest">Listagem de pessoal neste centro</p>
              </div>
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Pesquisar nesta unidade..."
                  className="pl-10 h-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all text-sm font-medium"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0 lg:p-2 sm:px-10">
            {filteredEmployees?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mb-4">
                  <User className="w-8 h-8 text-slate-200" />
                </div>
                <h4 className="text-slate-900 font-bold tracking-tight text-lg">Nenhum colaborador encontrado</h4>
                <p className="text-slate-400 text-sm font-medium mt-1">Tente ajustar sua busca ou aloque novos funcionários.</p>
              </div>
            ) : (
              <div className="overflow-x-auto px-3">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-slate-50">
                      <TableHead className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Colaborador</TableHead>
                      <TableHead className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Posição</TableHead>
                      <TableHead className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Status</TableHead>
                      <TableHead className="text-right text-slate-400 font-black uppercase tracking-widest text-[10px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees?.map((emp: any) => (
                      <TableRow key={emp.id} className="group hover:bg-slate-50/50 border-slate-50 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-4 py-2">
                            <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                              <img src={emp.image || "/avatar-placeholder.jpeg"} alt={emp.name} className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <p className="font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">{emp.name}</p>
                              <p className="text-slate-400 text-xs font-medium">{emp.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-bold text-slate-600 text-sm uppercase tracking-tighter">{emp.position}</p>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={emp.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/employees/${emp.id}`}>
                            <Button variant="outline" size="sm" className="gap-2 cursor-pointer rounded-xl font-bold border-slate-200 text-slate-600 hover:bg-white hover:border-emerald-200 hover:text-emerald-700 transition-all shadow-sm">
                              <Eye className="w-4 h-4" />
                              Ver Perfil
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
