"use client"

import { AppLayout } from "@/components/app-layout"
import { StatCard } from "@/components/stat-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, UserCheck, UserX, FileWarning, TrendingUp } from "lucide-react"
import { useEffect, useState } from "react"
import { useSnapshot } from "valtio"
import { useDashboardStore } from "@/stores/dashboard"
import { getDashboardData } from "@/actions/requests"
import { useCompanyStore } from "@/stores/company"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import Link from "next/link"

import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardPage() {
  const dashboardStore = useSnapshot(useDashboardStore)
  const companyStore = useSnapshot(useCompanyStore)

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    getDashboardData(companyStore.company_selected?.id || '')
  }, [companyStore.company_selected?.id])

  if (!mounted) return null

  const dashboard = dashboardStore.dashboard

  if (!dashboard) {
    return (
      <AppLayout>
        <div className="space-y-6 lg:space-y-10">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">Painel Operacional</h1>
            <p className="text-slate-500 text-sm lg:text-base font-medium">
              Visão estratégica da conformidade e efetivo da sua unidade.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="rounded-4xl border-slate-100 shadow-sm transition-all hover:shadow-md h-[120px]">
                <CardContent className="p-6 h-full flex items-center">
                  <div className="flex items-start justify-between w-full">
                    <div className="space-y-3 w-full">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="w-12 h-12 rounded-2xl" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
            <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden bg-white h-[450px]">
              <CardHeader className="p-6 lg:p-8 pb-4">
                <div className="flex items-center gap-3 mb-1">
                  <Skeleton className="w-9 h-9 rounded-xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 lg:p-8 pt-0">
                <Skeleton className="h-[300px] w-full rounded-2xl mt-4" />
              </CardContent>
            </Card>

            <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden bg-white h-[450px]">
              <CardHeader className="p-6 lg:p-8 pb-4">
                <div className="flex items-center gap-3 mb-1">
                  <Skeleton className="w-9 h-9 rounded-xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 lg:p-8 pt-0 flex justify-center items-center">
                <Skeleton className="h-[250px] w-[250px] rounded-full mt-4" />
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-[2.5rem] border-slate-100 shadow-sm bg-white overflow-hidden">
            <CardHeader className="p-6 lg:p-8 border-b border-slate-50">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-3 w-64" />
                </div>
                <Skeleton className="w-24 h-8 rounded-xl" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-50">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-6 flex gap-4 items-start">
                    <Skeleton className="size-2 mt-1.5 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-full max-w-md" />
                      <Skeleton className="h-2 w-24 mt-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6 lg:space-y-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">Painel Operacional</h1>
          <p className="text-slate-500 text-sm lg:text-base font-medium">
            Visão estratégica da conformidade e efetivo da sua unidade.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <StatCard
            title="Efetivo Total"
            value={dashboard?.employees.total || 0}
            icon={Users}
            description="Colaboradores cadastrados"
          />
          <StatCard
            title="Status Ativo"
            value={dashboard?.employees.active || 0}
            icon={UserCheck}
            trend={{ value: "Em dia", isPositive: true }}
            description="Operação normal"
          />
          <StatCard
            title="Irregularidades"
            value={dashboard?.employees.blocked || 0}
            icon={UserX}
            description="Requerem regularização"
          />
          <StatCard
            title="Vencimentos Próximos"
            value={dashboard?.documents.expiredSoon || 0}
            icon={FileWarning}
            description="Vencimento em 30 dias"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
          <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden bg-white">
            <CardHeader className="p-6 lg:p-8 pb-4">
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-emerald-50 rounded-xl">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-lg lg:text-xl font-bold text-slate-900">Status Documental</CardTitle>
                  <CardDescription className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Aprovações e Validades</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 lg:p-8 pt-0">
              {dashboard?.documentStats && dashboard.documentStats.length > 0 ? (
                <div className="h-[300px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[...dashboard.documentStats]} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                      <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                      <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                        {dashboard.documentStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-400 text-sm font-medium">
                  Informações indisponíveis no momento.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden bg-white">
            <CardHeader className="p-6 lg:p-8 pb-4">
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-slate-50 rounded-xl">
                  <Users className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <CardTitle className="text-lg lg:text-xl font-bold text-slate-900">Quadro Institucional</CardTitle>
                  <CardDescription className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Distribuição por Status</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 lg:p-8 pt-0">
              {dashboard?.employeeStats && dashboard.employeeStats.length > 0 ? (
                <div className="h-[300px] w-full mt-4 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <RechartsTooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                      <Pie
                        data={[...dashboard.employeeStats]}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                      >
                        {dashboard.employeeStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-400 text-sm font-medium">
                  Informações indisponíveis no momento.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-[2.5rem] border-slate-100 shadow-sm bg-white overflow-hidden">
          <CardHeader className="p-6 lg:p-8 border-b border-slate-50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
              <div>
                <CardTitle className="text-lg lg:text-xl font-bold text-slate-900">Histórico de Atividades</CardTitle>
                <CardDescription className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">Movimentações e Updates Recentes</CardDescription>
              </div>
              <Link href="/documents">
                <Button variant="outline" className="text-xs font-bold rounded-xl h-8 text-slate-500">Ver Todas</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-50">
              {dashboard?.recentActivities && dashboard.recentActivities.length > 0 ? (
                dashboard.recentActivities.map((activity) => (
                  <div key={activity.id} className="p-6 hover:bg-slate-50/50 transition-colors flex gap-4 items-start">
                    <div className="size-2 mt-1.5 rounded-full bg-emerald-500 shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-bold text-slate-800 tracking-tight">{activity.title}</p>
                      <p className="text-xs font-medium text-slate-500 leading-relaxed">{activity.description}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 block">
                        {formatDistanceToNow(new Date(activity.date), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-10 text-center text-slate-400 text-sm font-medium">Nenhuma atividade recente registrada.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
