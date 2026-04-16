"use client"

import { useEffect, useState } from "react"
import { useSnapshot } from "valtio"
import { useCostCentersStore } from "@/stores/cost-centers"
import { useCompanyStore } from "@/stores/company"
import { getCostCenters, deleteCostCenter } from "@/actions/requests"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Search, MapPin, Users, Pencil, Trash2, Loader2, DollarSign, ArrowRight, Building2 } from "lucide-react"
import { CostCenterForm } from "./cost-center-form"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import Link from "next/link"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export function CostCentersContent() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCenter, setEditingCenter] = useState<any>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const { costCenters } = useSnapshot(useCostCentersStore)
  const { company_selected } = useSnapshot(useCompanyStore)

  useEffect(() => {
    if (company_selected?.id) {
      getCostCenters(company_selected.id).catch(console.error)
    }
  }, [company_selected?.id])

  const filteredCenters = costCenters?.filter((center) =>
    center.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    center.city?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  async function handleDelete(id: string) {
    if (!company_selected?.id) return
    setIsDeleting(id)
    try {
      await deleteCostCenter(id, company_selected.id)
      toast.success("Centro de custo removido!")
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Erro ao excluir")
    } finally {
      setIsDeleting(null)
    }
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">Centros de Custo</h1>
          <p className="text-slate-500 text-sm lg:text-base font-medium">
            Gerencie as unidades e alocação de pessoal da sua empresa.
          </p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={(open) => {
          setIsFormOpen(open)
          if (!open) setEditingCenter(null)
        }}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto gap-2 cursor-pointer text-white rounded-xl shadow-lg shadow-green-100 px-6 h-11 font-bold">
              <Plus className="w-4 h-4" />
              Novo Centro
            </Button>
          </DialogTrigger>
          <CostCenterForm
            costCenter={editingCenter}
            onSuccess={() => {
              setIsFormOpen(false)
              setEditingCenter(null)
            }}
          />
        </Dialog>
      </div>

      <Card className="rounded-3xl border-slate-100 shadow-sm bg-white overflow-hidden">
        <CardContent className="p-4 lg:p-6">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Busque por nome ou cidade..."
              className="pl-10 h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all text-sm font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {!costCenters ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-slate-100 bg-white overflow-hidden rounded-3xl">
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-4">
                  <Skeleton className="h-10 w-full rounded-xl" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredCenters?.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 bg-white/50 border border-dashed border-slate-200 rounded-[3rem]">
            <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center mb-4">
              <DollarSign className="w-8 h-8 text-slate-300" />
            </div>
            <h4 className="text-slate-900 font-bold">Nenhum centro de custo encontrado</h4>
            <p className="text-slate-400 text-sm mt-1">Clique em "Novo Centro" para começar.</p>
          </div>
        ) : (
          filteredCenters?.map((center) => (
            <Card
              key={center.id}
              className="group p-0 hover:shadow-2xl hover:shadow-emerald-900/10 transition-all duration-500 rounded-[2.5rem] border-slate-100 bg-white overflow-hidden flex flex-col"
            >
              <CardContent className="p-6 lg:p-8 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-1.5">
                    <h3 className="font-extrabold text-slate-900 text-xl leading-tight group-hover:text-emerald-700 transition-colors">
                      {center.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-slate-500 font-bold text-xs uppercase tracking-wider">
                      <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                      {center.city ? `${center.city}${center.state ? `, ${center.state}` : ''}` : "Local não definido"}
                    </div>
                  </div>
                </div>

                <div className="mt-auto space-y-4">
                  <div className="bg-slate-50/80 rounded-2xl p-4 flex items-center justify-between border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100">
                        <Users className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Equipe</p>
                        <p className="text-slate-900 font-bold">{center._count?.employees || 0} Colaboradores</p>
                      </div>
                    </div>
                    <Link href={`/cost-centers/${center.id}`}>
                      <Button variant="ghost" size="icon" className="rounded-xl hover:bg-emerald-100 hover:text-emerald-700 transition-colors">
                        <ArrowRight className="w-5 h-5" />
                      </Button>
                    </Link>
                  </div>

                  <div className="flex gap-3">
                    <Link href={`/cost-centers/${center.id}`} className="flex-1">
                      <Button
                        className="w-full gap-2 cursor-pointer text-white rounded-2xl shadow-lg shadow-emerald-100 h-12 font-bold transition-all border-none"
                      >
                        Ver Detalhes
                      </Button>
                    </Link>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setEditingCenter(center)
                          setIsFormOpen(true)
                        }}
                        variant="ghost"
                        className="w-12 h-12 p-0 cursor-pointer rounded-2xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all border border-slate-100"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            className="w-12 h-12 p-0 cursor-pointer rounded-2xl bg-red-50/50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-all border border-red-100"
                            disabled={isDeleting === center.id}
                          >
                            {isDeleting === center.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-3xl border-slate-100">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="font-black">Tem certeza?</AlertDialogTitle>
                            <AlertDialogDescription className="font-medium">
                              Esta ação não pode ser desfeita. Isso excluirá o centro de custo "{center.name}" e removerá o vínculo com todos os funcionários.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-2xl font-bold">Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(center.id)}
                              className="bg-red-600 hover:bg-red-700 rounded-2xl font-bold"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
