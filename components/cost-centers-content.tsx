"use client"

import { useEffect, useState } from "react"
import { useSnapshot } from "valtio"
import { useCostCentersStore } from "@/stores/cost-centers"
import { useCompanyStore } from "@/stores/company"
import { getCostCenters, deleteCostCenter, toggleCostCenterFavorite } from "@/actions/requests"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Search, MapPin, Users, Pencil, Trash2, Loader2, DollarSign, ArrowRight, Building2, Star, Lock } from "lucide-react"
import { CostCenterForm } from "./cost-center-form"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import Link from "next/link"
import { useUserStore } from "@/stores/user"
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
  const [togglingFavoriteId, setTogglingFavoriteId] = useState<string | null>(null)

  const { costCenters } = useSnapshot(useCostCentersStore)
  const { company_selected } = useSnapshot(useCompanyStore)
  const user = useSnapshot(useUserStore).user

  const isSpy = (user?.role as string) === "ESPIAO"
  const spyPermissions = (user as any)?.permissions as Record<string, { view: boolean; edit: boolean }>
  const authorizedCcIds = ((user as any)?.costCenters || []) as string[]

  const hasEditPermission = () => {
    if (isSpy) {
      return spyPermissions["cost-centers"]?.edit === true
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

  async function handleToggleFavorite(id: string) {
    if (isSpy && !authorizedCcIds.includes(id)) return
    if (!verifyAction()) return
    if (!company_selected?.id) return
    setTogglingFavoriteId(id)
    try {
      await toggleCostCenterFavorite(id, company_selected.id)
      toast.success("Centro de custo favoritado!")
    } catch (error: any) {
      toast.error("Erro ao favoritar centro de custo")
    } finally {
      setTogglingFavoriteId(null)
    }
  }

  useEffect(() => {
    if (company_selected?.id) {
      getCostCenters(company_selected.id).catch(console.error)
    }
  }, [company_selected?.id])

  const filteredCenters = costCenters?.filter((center) =>
    center.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    center.city?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Sort cost centers: authorized first, unauthorized last
  const sortedCenters = filteredCenters ? [...filteredCenters].sort((a, b) => {
    if (isSpy) {
      const aAuth = authorizedCcIds.includes(a.id)
      const bAuth = authorizedCcIds.includes(b.id)
      if (aAuth && !bAuth) return -1
      if (!aAuth && bAuth) return 1
    }
    return 0
  }) : []

  async function handleDelete(id: string) {
    if (!verifyAction()) return
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

  const handleOpenCreateDialog = () => {
    if (!verifyAction()) return
    setEditingCenter(null)
    setIsFormOpen(true)
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
          if (open && !verifyAction()) return
          setIsFormOpen(open)
          if (!open) setEditingCenter(null)
        }}>
          <Button onClick={handleOpenCreateDialog} className="w-full sm:w-auto gap-2 cursor-pointer text-white rounded-xl shadow-lg shadow-green-100 px-6 h-11 font-bold">
            <Plus className="w-4 h-4" />
            Novo Centro
          </Button>
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

      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
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
        ) : sortedCenters?.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 bg-white/50 border border-dashed border-slate-200 rounded-[3rem]">
            <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center mb-4">
              <DollarSign className="w-8 h-8 text-slate-300" />
            </div>
            <h4 className="text-slate-900 font-bold">Nenhum centro de custo encontrado</h4>
            <p className="text-slate-400 text-sm mt-1">Clique em "Novo Centro" para começar.</p>
          </div>
        ) : (
          sortedCenters?.map((center) => {
            const isAuthorized = !isSpy || authorizedCcIds.includes(center.id)

            return (
              <Card
                key={center.id}
                className="group border p-0 border-slate-100 bg-white hover:border-slate-200 hover:shadow-xl hover:shadow-slate-100/50 transition-all duration-300 rounded-3xl overflow-hidden flex flex-col relative"
              >
                {/* Lock Overlay for unauthorized cost centers */}
                {!isAuthorized && (
                  <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[1.5px] flex flex-col items-center justify-center p-4 text-center z-10 select-none pointer-events-none">
                    <div className="p-3 bg-white/95 border border-slate-100 rounded-2xl text-purple-600 shadow-md mb-2">
                      <Lock className="w-5 h-5 animate-pulse" />
                    </div>
                    <p className="text-xs font-black text-slate-800 tracking-tight">Acesso Restrito</p>
                    <p className="text-[9px] text-slate-500 font-semibold mt-0.5 max-w-[180px]">Seu perfil espião não possui permissão para visualizar este Centro de Custo.</p>
                  </div>
                )}

                <CardContent className={`p-6 flex flex-col flex-1 ${!isAuthorized ? "filter blur-[3.5px] pointer-events-none select-none" : ""}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="space-y-1 flex-1 min-w-0 pr-2">
                      <h3 className="font-bold text-slate-800 text-lg leading-tight group-hover:text-emerald-600 transition-colors truncate" title={center.name}>
                        {center.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-semibold text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {center.city ? `${center.city}${center.state ? `, ${center.state}` : ''}` : "Não definido"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {center._count?.employees || 0} colaboradores
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={togglingFavoriteId === center.id || !isAuthorized}
                      onClick={() => handleToggleFavorite(center.id)}
                      className="w-8 h-8 rounded-full hover:bg-amber-50 cursor-pointer shrink-0"
                    >
                      {togglingFavoriteId === center.id ? (
                        <Loader2 className="w-4.5 h-4.5 animate-spin text-slate-400" />
                      ) : center.isFavorite ? (
                        <Star className="w-4.5 h-4.5 fill-amber-400 text-amber-400" />
                      ) : (
                        <Star className="w-4.5 h-4.5 text-slate-300 hover:text-amber-400 transition-colors" />
                      )}
                    </Button>
                  </div>

                  <div className="border-t border-slate-100 pt-4 mt-auto flex justify-between items-center">
                    <Link href={`/cost-centers/${center.id}`}>
                      <span className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5 group/link cursor-pointer">
                        Ver Detalhes
                        <ArrowRight className="w-4 h-4 group-hover/link:translate-x-0.5 transition-transform" />
                      </span>
                    </Link>

                    <div className="flex gap-1.5">
                      <Button
                        onClick={() => {
                          if (!verifyAction()) return
                          setEditingCenter(center)
                          setIsFormOpen(true)
                        }}
                        variant="ghost"
                        className="w-9 h-9 p-0 cursor-pointer rounded-xl bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all border border-slate-100"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            className="w-9 h-9 p-0 cursor-pointer rounded-xl bg-red-50/50 text-red-500 hover:bg-red-50 hover:text-red-600 transition-all border border-red-100"
                            disabled={isDeleting === center.id}
                            onClick={(e) => {
                              if (!verifyAction()) {
                                e.preventDefault()
                                e.stopPropagation()
                              }
                            }}
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
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
