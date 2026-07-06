"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/status-badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Search, IdCard, Mail, RotateCw, History, ShieldCheck, ArrowRight } from "lucide-react"
import { useSnapshot } from "valtio"
import { useEmployeesStore } from "@/stores/employees"
import { getEmployees, emitPassport } from "@/actions/requests"
import { useCompanyStore } from "@/stores/company"
import { useUserStore } from "@/stores/user"
import { AppLayout } from "@/components/app-layout"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { SpyPageGuard } from "@/components/spy-page-guard"

export default function PassportSelectionPage() {
    const [statusFilter, setStatusFilter] = useState("all")
    const [searchQuery, setSearchQuery] = useState("")
    const [loading, setLoading] = useState<string | null>(null)
    const useEmployee = useSnapshot(useEmployeesStore)
    const companyStore = useSnapshot(useCompanyStore)
    const user = useSnapshot(useUserStore).user
    const router = useRouter()

    const filteredEmployees = useEmployee.employees?.filter((employee) => {
        const matchesStatus = statusFilter === "all" || employee.status === statusFilter
        const matchesSearch =
            employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            employee.cpf.includes(searchQuery)

        return matchesStatus && matchesSearch
    })

    useEffect(() => {
        if (companyStore.company_selected?.id) {
            getEmployees(companyStore.company_selected.id)
        }
    }, [companyStore.company_selected?.id])

    async function handleEmitPassport(employeeId: string) {
        if ((user?.role as string) === "ESPIAO") {
            const perms = (user as any).permissions as Record<string, { view: boolean; edit: boolean }>
            if (perms["passport"]?.edit !== true) {
                toast.warning("Seu perfil possui acesso somente para visualização.")
                return
            }
        }
        setLoading(employeeId)
        try {
            await emitPassport(employeeId)
            toast.success("Perfil de qualificação emitido com sucesso!")
            router.push(`/passport/view/${employeeId}`)
        } catch (error) {
            console.error(error)
            toast.error("Erro ao emitir perfil de qualificação")
        } finally {
            setLoading(null)
        }
    }

    return (
        <AppLayout>
            <SpyPageGuard
                page="passport"
                extraActions={
                    <Link href="/passport/history" className="w-full block">
                        <Button variant="outline" className="w-full gap-2 cursor-pointer rounded-xl h-11 font-bold mt-2">
                            <History className="w-4 h-4" />
                            Ir para Histórico
                        </Button>
                    </Link>
                }
            >
                <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">Perfil de qualificação</h1>
                        <p className="text-muted-foreground mt-1">
                            Selecione um funcionário para emitir ou visualizar o perfil de qualificação.
                        </p>
                    </div>
                    <Link href="/passport/history">
                        <Button variant="outline" className="gap-2 cursor-pointer">
                            <History className="w-4 h-4" />
                            Ver Histórico
                        </Button>
                    </Link>
                </div>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Pesquise pelo nome ou CPF..."
                                    className="pl-9"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full sm:w-48">
                                    <SelectValue placeholder="Filtrar por status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="ACTIVE">Ativo</SelectItem>
                                    <SelectItem value="TERMINATED">Demitido</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
                    {!useEmployee.employees ? (
                        Array.from({ length: 6 }).map((_, i) => (
                            <Card key={i} className="hover:shadow-lg transition-all duration-300 py-0 rounded-2xl border-primary/10">
                                <CardContent className="p-6 space-y-4">
                                    <div className="flex items-center gap-4">
                                        <Skeleton className="w-16 h-16 rounded-full shrink-0" />
                                        <div className="flex-1 space-y-2">
                                            <Skeleton className="h-5 w-48" />
                                            <div className="flex items-center gap-2 mt-1">
                                                <Skeleton className="h-6 w-20 rounded-full" />
                                                <Skeleton className="h-3 w-32" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2 text-sm">
                                        <div className="flex justify-between items-center text-xs">
                                            <Skeleton className="h-3 w-16" />
                                            <Skeleton className="h-4 w-28" />
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <Skeleton className="h-3 w-16" />
                                            <Skeleton className="h-4 w-40" />
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Skeleton className="h-10 w-full rounded-xl" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : filteredEmployees?.length === 0 ? (
                        <p className="col-span-full text-center text-muted-foreground py-12">
                            Nenhum funcionário encontrado.
                        </p>
                    ) : (
                        filteredEmployees?.map((employee) => (
                            <Card
                                key={employee.id}
                                className="hover:shadow-lg transition-all duration-300 py-0 rounded-2xl border-primary/10"
                            >
                                <CardContent className="p-6 space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-full overflow-hidden bg-muted shrink-0 ring-2 ring-primary/20">
                                            <img
                                                src={employee.image || "/avatar-placeholder.jpeg"}
                                                alt={employee.name}
                                                className="object-cover w-full h-full"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-lg leading-tight capitalize">
                                                {employee.name}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <StatusBadge status={employee.status} />
                                                <span className="text-xs text-muted-foreground">{employee.position}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2 text-sm">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-muted-foreground uppercase flex items-center gap-1">
                                                <IdCard className="w-3 h-3" /> CPF
                                            </span>
                                            <span className="font-medium">{employee.cpf}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-muted-foreground uppercase flex items-center gap-1">
                                                <Mail className="w-3 h-3" /> Email
                                            </span>
                                            <span className="font-medium truncate max-w-[150px]">{employee.email}</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            onClick={() => handleEmitPassport(employee.id)}
                                            disabled={loading === employee.id}
                                            className="gap-2 flex-1 cursor-pointer bg-primary hover:bg-primary/90 rounded-xl"
                                        >
                                            <ShieldCheck className="w-4 h-4" />
                                            {loading === employee.id ? "Emitindo..." : "Emitir Perfil de qualificação"}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </SpyPageGuard>
    </AppLayout>
  )
}