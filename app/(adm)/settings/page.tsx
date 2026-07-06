"use client"

import { logout, updatePassword, updateProfile } from "@/actions/requests"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useUserStore } from "@/stores/user"
import { useSnapshot } from "valtio"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2, Building2, Bell, ChevronRight, ShieldAlert } from "lucide-react"
import Link from "next/link"
import { SpyPageGuard } from "@/components/spy-page-guard"

export default function SettingsPage() {
  const user = useSnapshot(useUserStore).user
  const [name, setName] = useState(user?.name)
  const [email, setEmail] = useState(user?.email || "")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      setName(user.name)
      setEmail(user.email)
    }
  }, [user])

  const handleUpdateProfile = async () => {
    try {
      setLoading(true)
      await updateProfile({ name, email })
      toast.success("Perfil atualizado com sucesso!")
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Erro ao atualizar perfil")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePassword = async () => {
    setLoading(true)
    try {
      await updatePassword({ currentPassword, newPassword, confirmPassword, userId: user?.id || '' })
      toast.success("Senha atualizada com sucesso!")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Erro ao atualizar senha")
      console.error(error)
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
    <AppLayout>
      <SpyPageGuard page="settings">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">Configurações</h1>
            <p className="text-muted-foreground mt-1">Gerencie sua conta e as preferências da sua empresa</p>
          </div>

          {user?.role !== "RH" && (
            <div className="grid md:grid-cols-3 gap-6">
              <Link href="/settings/company" className="group block w-full">
                <Card className="relative overflow-hidden border border-slate-100 hover:border-slate-200 bg-white/70 backdrop-blur-md hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-100/50 transition-all duration-300 cursor-pointer h-full">
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-emerald-500 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <CardContent className="flex items-center justify-between gap-4 p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300 ring-4 ring-emerald-50/50 shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-base font-bold text-slate-800 tracking-tight group-hover:text-emerald-700 transition-colors duration-200">Configurações da Empresa</h3>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">Gerenciar informações básicas, logo e documentos padrão</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all duration-300 shrink-0" />
                  </CardContent>
                </Card>
              </Link>

              <Link href="/settings/notifications" className="group block w-full">
                <Card className="relative overflow-hidden border border-slate-100 hover:border-slate-200 bg-white/70 backdrop-blur-md hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-100/50 transition-all duration-300 cursor-pointer h-full">
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-blue-500 to-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <CardContent className="flex items-center justify-between gap-4 p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-500 group-hover:text-white transition-all duration-300 ring-4 ring-blue-50/50 shrink-0">
                        <Bell className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-base font-bold text-slate-800 tracking-tight group-hover:text-blue-700 transition-colors duration-200">Central de Notificações</h3>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">Gerenciar múltiplos destinatários e histórico de e-mails enviados</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all duration-300 shrink-0" />
                  </CardContent>
                </Card>
              </Link>

              <Link href="/settings/infiltration" className="group block w-full">
                <Card className="relative overflow-hidden border border-slate-100 hover:border-slate-200 bg-white/70 backdrop-blur-md hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-100/50 transition-all duration-300 cursor-pointer h-full">
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-purple-500 to-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <CardContent className="flex items-center justify-between gap-4 p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl group-hover:bg-purple-500 group-hover:text-white transition-all duration-300 ring-4 ring-purple-50/50 shrink-0">
                        <ShieldAlert className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-base font-bold text-slate-800 tracking-tight group-hover:text-purple-700 transition-colors duration-200">Acesso Espião (Infiltração)</h3>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">Gerenciar links e acessos temporários para terceiros e auditores</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-purple-500 group-hover:translate-x-1 transition-all duration-300 shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            </div>
          )}

          <Tabs defaultValue="profile" className="w-full">
            <TabsList>
              <TabsTrigger value="profile">Perfil</TabsTrigger>
              <TabsTrigger value="security">Segurança</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Informações pessoais</CardTitle>
                  <CardDescription>Atualize suas informações pessoais</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="w-full flex items-center gap-4">
                    <div className="space-y-2 w-full">
                      <Label htmlFor="firstName">Nome</Label>
                      <Input id="firstName" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="space-y-2 w-full">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" readOnly={user?.role === "RH"} value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                  </div>
                  <Button disabled={loading} className="cursor-pointer" onClick={handleUpdateProfile}>
                    {loading ? <Loader2 className="animate-spin" /> : 'Salvar'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sair da conta</CardTitle>
                  <CardDescription>Ao sair da conta, você será redirecionado para a página de login</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="destructive" disabled={loading} className="cursor-pointer" onClick={handleLogout}>
                    {loading ? <Loader2 className="animate-spin" /> : 'Sair da conta'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Alterar senha</CardTitle>
                  <CardDescription>Atualize sua senha para manter sua conta segura</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Senha atual</Label>
                    <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} id="currentPassword" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nova senha</Label>
                    <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} id="newPassword" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                    <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} id="confirmPassword" />
                  </div>
                  <Button disabled={loading || !currentPassword || !newPassword || !confirmPassword} className="cursor-pointer" onClick={handleUpdatePassword}>
                    {loading ? <Loader2 className="animate-spin" /> : 'Atualizar senha'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </SpyPageGuard>
    </AppLayout>
  )
}
