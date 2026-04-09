"use client"

import {
  Building2,
  Users,
  FileText,
  ArrowRight,
  CheckCircle2,
  Plus,
  Loader2,
  Upload,
  LayoutDashboard
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { GetCompanies, createCompany, logout, uploadImage } from "@/actions/requests"
import { useCompanyStore } from "@/stores/company"
import { useSnapshot } from "valtio"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useUserStore } from "@/stores/user"
import { toast } from "sonner"
import Image from "next/image"

export default function HomePage() {
  const router = useRouter()
  const { companies } = useSnapshot(useCompanyStore)
  const { user_token, user } = useSnapshot(useUserStore)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const [form, setForm] = useState({
    name: '', cnpj: '', email: '', phone: '', address: '', state: '', city: '', responsible: '', image_url: ''
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user_token) return
    GetCompanies(user_token || '')
  }, [user_token])

  const handleCompanyClick = (companyId: string) => {
    router.push(`/dashboard`)
    localStorage.setItem('company_id', companyId)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setLoading(true)
      try {
        const uploaded: any = await uploadImage(file)
        setForm(prev => ({ ...prev, image_url: uploaded.url }))
        toast.success("Logo adicionada com sucesso!")
      } catch (error) {
        toast.error("Erro ao enviar a imagem.")
      } finally {
        setLoading(false)
      }
    }
  }

  const handleCreate = async () => {
    if (!form.name || !form.cnpj) {
      toast.warning("Nome e CNPJ são obrigatórios.")
      return
    }

    setLoading(true)
    try {
      await createCompany({ ...form, userId: user!.id })
      toast.success("Empresa criada com sucesso!")
      setOpen(false)
      if (user_token) GetCompanies(user_token)
      setForm({ name: '', cnpj: '', email: '', phone: '', address: '', state: '', city: '', responsible: '', image_url: '' })
    } catch (error) {
      toast.error("Erro ao criar a empresa.")
    } finally {
      setLoading(false)
    }
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

        {companies.length === 0 ? (
          <Card className="p-12 lg:p-20 text-center bg-white/80 backdrop-blur border border-slate-100 rounded-3xl shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Building2 className="w-8 h-8 text-slate-300" />
            </div>
            <h4 className="text-slate-900 font-bold text-lg mb-2">Nenhuma empresa encontrada</h4>
            <p className="text-slate-500 mb-8 max-w-sm mx-auto">
              Você ainda não gerencia nenhuma empresa. Entre em contato com o suporte.
            </p>
            {/* <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-10 h-12 font-bold transition-all hover:scale-[1.02]">
              Criar Primeira Empresa
            </Button> */}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {companies.map((company) => (
              <Card
                key={company.id}
                onClick={() => handleCompanyClick(company.id)}
                className="p-6 bg-white/80 backdrop-blur border border-slate-100 hover:shadow-xl hover:shadow-emerald-900/5 hover:border-emerald-200 transition-all duration-300 cursor-pointer group rounded-3xl"
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
                      <h4 className="font-bold text-slate-900 text-lg leading-tight group-hover:text-emerald-700 transition-colors">
                        {company.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-none px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                          {company.role}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 text-slate-300 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-all">
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
            ))}
          </div>
        )}
      </main>
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
