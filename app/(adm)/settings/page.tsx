"use client"

import { logout, updateNotifications, updatePassword, updateProfile } from "@/actions/requests"
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
import { Loader2, Building2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import Link from "next/link"

export default function SettingsPage() {
  const user = useSnapshot(useUserStore).user
  const [name, setName] = useState(user?.name)
  const [email, setEmail] = useState(user?.email || "")
  const [notificationEmail, setNotificationEmail] = useState(user?.notificationPreferences?.email || "")
  const [docExpirationAlerts, setDocExpirationAlerts] = useState(user?.notificationPreferences?.documentExpirationAlerts ?? true)
  const [newEmployeeAlerts, setNewEmployeeAlerts] = useState(user?.notificationPreferences?.newEmployeeAlerts ?? true)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      setName(user.name)
      setEmail(user.email)
      setNotificationEmail(user.notificationPreferences?.email || "")
      setDocExpirationAlerts(user.notificationPreferences?.documentExpirationAlerts ?? true)
      setNewEmployeeAlerts(user.notificationPreferences?.newEmployeeAlerts ?? true)
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

  const handleUpdateNotifications = async () => {
    setLoading(true)
    try {
      await updateNotifications({
        documentExpirationAlerts: docExpirationAlerts,
        newEmployeeAlerts: newEmployeeAlerts,
        email: notificationEmail
      })
      toast.success("Preferências de notificação atualizadas!")
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Erro ao atualizar notificações")
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
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">Configurações</h1>
          <p className="text-muted-foreground mt-1">Gerencie sua conta e as preferências da sua empresa</p>
        </div>

        <Link href="/settings/company" className="block w-full">
          <Card className="hover:border-emerald-500 hover:bg-emerald-50/50 transition-all cursor-pointer">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 bg-emerald-100 rounded-xl">
                <Building2 className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Configurações da Empresa</h3>
                <p className="text-sm text-slate-500">Gerenciar informações básicas, logo e documentos (PGR, PCMSO, etc)</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList>
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="security">Segurança</TabsTrigger>
            <TabsTrigger value="notifications">Notificações</TabsTrigger>
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
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
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

          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Preferência de emails</CardTitle>
                <CardDescription>Escolha quais emails você deseja receber</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">Alertas de vencimento de documentos</p>
                    <p className="text-sm text-muted-foreground">Receba um email quando documentos estiverem prestes a expirar</p>
                  </div>
                  <Switch checked={docExpirationAlerts} onCheckedChange={setDocExpirationAlerts} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">Novo funcionário adicionado</p>
                    <p className="text-sm text-muted-foreground">Receba um email quando um novo funcionário for adicionado</p>
                  </div>
                  <Switch checked={newEmployeeAlerts} onCheckedChange={setNewEmployeeAlerts} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Configuração do email</CardTitle>
                <CardDescription>Configure o email que você deseja receber notificações</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="notifEmail">Email de Notificação</Label>
                  <Input value={notificationEmail} onChange={(e) => setNotificationEmail(e.target.value)} id="notifEmail" placeholder="Deixe vazio para usar o email da conta" />
                </div>
              </CardContent>
            </Card>

            <Button disabled={loading} className="cursor-pointer" onClick={handleUpdateNotifications}>
              {loading ? <Loader2 className="animate-spin" /> : 'Salvar'}
            </Button>
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
    </AppLayout>
  )
}
