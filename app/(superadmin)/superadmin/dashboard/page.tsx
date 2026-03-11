"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Users, FileText, Plus, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "@/components/status-badge"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { getSuperAdminDashboard } from "@/actions/requests"
import { SuperAdminAppLayout } from "@/components/superadm-layout"

export default function SuperAdminDashboard() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getSuperAdminDashboard()
            .then((json) => {
                setData(json)
                setLoading(false)
            })
            .catch((err) => {
                console.error(err)
                setLoading(false)
            })
    }, [])

    if (loading) {
        return (
            <SuperAdminAppLayout>
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <Skeleton className="h-10 w-64" />
                        <Skeleton className="h-10 w-40" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <Skeleton key={i} className="h-32 w-full" />
                        ))}
                    </div>
                    <Skeleton className="h-64 w-full" />
                </div>
            </SuperAdminAppLayout>
        )
    }

    return (
        <SuperAdminAppLayout>
            <div className="space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">Dashboard Global</h1>
                        <p className="text-slate-500 mt-1">Visão geral de todas as empresas e funcionários do sistema.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title="Total de Empresas"
                        value={data.stats.companies.total}
                        description={`${data.stats.companies.active} ativas`}
                        icon={<Building2 className="w-6 h-6 text-emerald-600" />}
                        color="bg-emerald-50"
                    />
                    <StatCard
                        title="Total de Funcionários"
                        value={data.stats.employees.total}
                        description="Em todas as empresas"
                        icon={<Users className="w-6 h-6 text-blue-600" />}
                        color="bg-blue-50"
                    />
                    <StatCard
                        title="Documentos Pendentes"
                        value={data.stats.documents.pending}
                        description="Aguardando validação"
                        icon={<FileText className="w-6 h-6 text-amber-600" />}
                        color="bg-amber-50"
                    />
                    <StatCard
                        title="Documentos Expirados"
                        value={data.stats.documents.expired}
                        description="Necessitam renovação"
                        icon={<FileText className="w-6 h-6 text-red-600" />}
                        color="bg-red-50"
                    />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 xl:gap-4 max-xl:space-y-5">
                    <Card className="lg:col-span-2 rounded-3xl border-slate-100 shadow-sm overflow-hidden bg-white">
                        <CardHeader className="border-b border-slate-50 flex flex-row items-center justify-between px-8 py-6">
                            <CardTitle className="text-xl font-bold">Empresas Recentes</CardTitle>
                            <Link href="/superadmin/companies" className="text-emerald-600 hover:text-emerald-700 text-sm font-bold flex items-center gap-1">
                                Ver todas <ArrowRight className="w-4 h-4" />
                            </Link>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50/50">
                                        <tr>
                                            <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Empresa</th>
                                            <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                            <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Funcionários</th>
                                            <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Cadastrada em</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {data.recentCompanies.map((company: any) => (
                                            <tr key={company.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer group">
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl border border-slate-100 overflow-hidden shrink-0">
                                                            <img src={company.imageUrl || "/placeholder-company.png"} alt={company.name} className="w-full h-full object-cover" />
                                                        </div>
                                                        <span className="font-bold text-slate-700 group-hover:text-emerald-700 transition-colors">{company.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <StatusBadge status={company.status.toLowerCase()} />
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className="text-slate-600 font-medium">{company._count.employees}</span>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <span className="text-slate-500 text-sm">{format(new Date(company.createdAt), "dd 'de' MMM, yyyy", { locale: ptBR })}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-3xl border-slate-100 shadow-sm bg-white w-full!">
                        <CardHeader className="border-b border-slate-50 px-8 py-6">
                            <CardTitle className="text-xl font-bold">Status de Documentos</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 w-full!">
                            <div className="space-y-6">
                                <DocumentMetric
                                    label="Aprovados"
                                    value={data.stats.documents.approved}
                                    total={data.stats.documents.approved + data.stats.documents.pending + data.stats.documents.expired}
                                    color="bg-emerald-500"
                                />
                                <DocumentMetric
                                    label="Pendentes"
                                    value={data.stats.documents.pending}
                                    total={data.stats.documents.approved + data.stats.documents.pending + data.stats.documents.expired}
                                    color="bg-amber-500"
                                />
                                <DocumentMetric
                                    label="Expirados"
                                    value={data.stats.documents.expired}
                                    total={data.stats.documents.approved + data.stats.documents.pending + data.stats.documents.expired}
                                    color="bg-red-500"
                                />
                            </div>
                            <div className="mt-8 pt-8 border-t border-slate-50 text-center">
                                <p className="text-slate-400 text-sm italic font-medium line-clamp-2">Os documentos expiram conforme o prazo estabelecido pela regulamentação vigente.</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </SuperAdminAppLayout>
    )
}

function StatCard({ title, value, description, icon, color }: any) {
    return (
        <Card className="rounded-3xl border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden bg-white">
            <CardContent className="p-6">
                <div className="flex items-center gap-4">
                    <div className={`${color} p-4 rounded-2xl group-hover:scale-110 transition-transform`}>
                        {icon}
                    </div>
                    <div className="truncate">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider truncate">{title}</p>
                        <p className="text-3xl font-black text-slate-900 mt-0.5">{value}</p>
                        <p className="text-xs font-medium text-slate-500 mt-1 truncate">{description}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function DocumentMetric({ label, value, total, color }: any) {
    const percentage = total > 0 ? (value / total) * 100 : 0
    return (
        <div className="space-y-2">
            <div className="flex justify-between items-end">
                <span className="text-sm font-bold text-slate-700">{label}</span>
                <span className="text-sm font-black text-slate-900">{value}</span>
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                    className={`h-full ${color} rounded-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    )
}
