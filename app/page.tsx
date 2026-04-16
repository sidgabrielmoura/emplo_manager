"use client"

import { Skeleton } from "@/components/ui/skeleton"
import {
  Building2,
  Users,
  FileText,
  ArrowRight,
  CheckCircle2,
  Plus,
  Loader2,
  Upload,
  LayoutDashboard,
  ShieldAlert,
  MessageCircle
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { GetCompanies, createCompany, logout, uploadImage } from "@/actions/requests"
import { useCompanyStore } from "@/stores/company"
import { useSnapshot } from "valtio"
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useUserStore } from "@/stores/user"
import { toast } from "sonner"
import Image from "next/image"

export default function HomePage() {
  const router = useRouter()
  const { companies, loading: companiesLoading } = useSnapshot(useCompanyStore)
  const { user_token, user } = useSnapshot(useUserStore)
  const [loading, setLoading] = useState(false)
  const [blockedModalOpenControl, setBlockedModalOpenControl] = useState(false)

  useEffect(() => {
    if (!user_token) return
    GetCompanies(user_token || '')
  }, [user_token])

  const handleCompanyClick = (companyId: string) => {
    router.push(`/dashboard`)
    localStorage.setItem('company_id', companyId)
  }

  const handleLogout = async () => {
    try {
      setLoading(true)
      await logout()
    } catch (error) {
      toast.error("Erro ao sair da conta")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[600px] h-[600px] bg-emerald-50 rounded-full blur-[120px] opacity-60"></div>
      <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-green-50 rounded-full blur-[100px] opacity-40"></div>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-16 relative z-10">
        <div className="mb-12 flex justify-center items-center w-full lg:justify-between gap-8">
          <Image src="/ETX-GESTAO-4.png" alt="ETX GESTÃO" width={180} height={45} className="w-auto h-10 lg:h-18" />
          <Button variant="destructive" disabled={loading} className="cursor-pointer" onClick={handleLogout}>
            {loading ? <Loader2 className="animate-spin" /> : 'Sair da conta'}
          </Button>
        </div>

        <div className="mb-10 text-center lg:text-left">
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">
            Bem-vindo de volta
          </h2>
          <p className="text-slate-500 mt-2 text-base lg:text-lg">
            Selecione uma empresa para acessar o sistema de gestão operacional.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-12">
          {companiesLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-5 lg:p-6 bg-white border border-slate-100 rounded-4xl flex items-center gap-4">
                <Skeleton className="h-14 w-14 rounded-3xl" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-8 w-12" />
                </div>
              </Card>
            ))
          ) : (
            <>
              <MetricCard
                label="Empresas"
                value={companies.length}
                icon={<Building2 className="w-5 h-5 text-emerald-600" />}
                bg="bg-emerald-50"
              />

              <MetricCard
                label="Funcionários"
                value={companies.reduce((acc, c) => acc + (c.totalEmployees || 0), 0)}
                icon={<Users className="w-5 h-5 text-emerald-600" />}
                bg="bg-emerald-50"
              />

              <MetricCard
                label="Documentos"
                value={companies.reduce((acc, c) => acc + (c.totalDocuments || 0), 0)}
                icon={<FileText className="w-5 h-5 text-emerald-600" />}
                bg="bg-emerald-50"
              />

              <MetricCard
                label="Acessos Ativos"
                value={companies.filter((c) => c.role === "ADMIN").length}
                icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                bg="bg-emerald-50"
              />
            </>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <h3 className="text-xl lg:text-2xl font-bold text-slate-900">
            Empresas Recentes
          </h3>
          {user?.role === "SUPERADMIN" && (
            <Button
              onClick={() => router.push("/superadmin/dashboard")}
              className="text-white cursor-pointer gap-2 rounded-xl h-11 px-6 font-bold transition-all hover:scale-[1.02]"
            >
              <LayoutDashboard className="w-5 h-5" />
              Acessar Painel SuperAdmin
            </Button>
          )}
        </div>

        {companiesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-6 bg-white border border-slate-100 rounded-3xl space-y-6">
                <div className="flex items-center gap-4">
                  <Skeleton className="size-14 rounded-2xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <div className="flex gap-8 pt-6 border-t border-slate-50">
                  <div className="space-y-2">
                    <Skeleton className="h-2 w-16" />
                    <Skeleton className="h-6 w-8" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-2 w-16" />
                    <Skeleton className="h-6 w-8" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : companies.length === 0 ? (
          <Card className="p-12 lg:p-20 text-center bg-white/80 backdrop-blur border border-slate-100 rounded-3xl shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Building2 className="w-8 h-8 text-slate-300" />
            </div>
            <h4 className="text-slate-900 font-bold text-lg mb-2">Nenhuma empresa encontrada</h4>
            <p className="text-slate-500 mb-8 max-w-sm mx-auto">
              Você ainda não gerencia nenhuma empresa. Entre em contato com o suporte.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {companies.map((company) => {
              const isBlocked = company.status === "BLOCKED"
              return (
                <Card
                  key={company.id}
                  onClick={() => !isBlocked ? handleCompanyClick(company.id) : setBlockedModalOpenControl(true)}
                  className={`p-6 backdrop-blur border transition-all duration-300 group rounded-3xl ${isBlocked
                    ? "bg-red-50/50 border-red-200 cursor-pointer"
                    : "bg-white/80 border-slate-100 hover:shadow-xl hover:shadow-emerald-900/5 hover:border-emerald-200 cursor-pointer"
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden border border-slate-100 shadow-sm shrink-0">
                        <img
                          src={company.imageUrl || "/placeholder-company.png"}
                          alt={company.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div>
                        <h4 className={`font-bold text-lg leading-tight transition-colors ${isBlocked ? "text-red-900" : "text-slate-900 group-hover:text-emerald-700"}`}>
                          {company.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge variant="secondary" className={`${isBlocked ? "bg-red-100 text-red-700" : "bg-emerald-50 text-emerald-700"} border-none px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider`}>
                            {isBlocked ? "BLOQUEADA" : company.role}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className={`p-2 rounded-xl transition-all ${isBlocked ? "bg-red-50 text-red-300" : "bg-slate-50 text-slate-300 group-hover:bg-emerald-100 group-hover:text-emerald-600"}`}>
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="flex gap-8 mt-8 pt-6 border-t border-slate-50">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Funcionários</p>
                      <p className="text-xl font-bold text-slate-800">
                        {company.totalEmployees || 0}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Documentos</p>
                      <p className="text-xl font-bold text-slate-800">
                        {company.totalDocuments || 0}
                      </p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </main>

      <Dialog open={blockedModalOpenControl} onOpenChange={setBlockedModalOpenControl}>
        <DialogContent className="sm:max-w-md text-center p-8 rounded-3xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 mb-2">
            <ShieldAlert className="h-8 w-8 text-red-600" />
          </div>
          <DialogTitle className="text-2xl font-bold text-slate-900 mb-1 mt-2">Empresa Bloqueada</DialogTitle>
          <DialogDescription className="text-slate-500 text-base mb-6">
            O acesso a esta empresa foi temporariamente bloqueado. Para regularizar a situação ou obter mais detalhes, por favor, entre em contato com nosso suporte financeiro.
          </DialogDescription>

          <div className="flex flex-col gap-3">
            <a
              href="https://wa.me/5511999999999"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full"
            >
              <Button className="w-full bg-[#25D366] hover:bg-[#1fbc5a] text-white rounded-xl h-11 font-bold text-base gap-2 cursor-pointer transition-all hover:scale-[1.02]">
                <MessageCircle className="w-5 h-5" />
                Falar com o Suporte
              </Button>
            </a>
            <Button
              variant="outline"
              onClick={() => setBlockedModalOpenControl(false)}
              className="w-full rounded-xl h-11 font-bold cursor-pointer"
            >
              Voltar ao Início
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MetricCard({
  label,
  value,
  icon,
  bg
}: {
  label: string
  value: number
  icon: React.ReactNode
  bg: string
}) {
  return (
    <Card className="p-5 lg:p-6 bg-white/80 backdrop-blur border border-slate-100 shadow-sm hover:shadow-md transition-shadow rounded-4xl">
      <div className="flex items-center gap-4">
        <div className={`p-4 rounded-3xl shadow-sm ${bg} transition-transform group-hover:scale-110`}>
          {icon}
        </div>
        <div>
          <p className="text-xs lg:text-sm font-bold text-slate-400 uppercase tracking-wider">{label}</p>
          <p className="text-2xl lg:text-3xl font-black text-slate-900 leading-none mt-1">{value}</p>
        </div>
      </div>
    </Card>
  )
}
