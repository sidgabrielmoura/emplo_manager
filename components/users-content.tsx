"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, EyeOff, Loader2, Search, UserPlus } from "lucide-react"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createUser, deleteUser, getAllUsers, updateUser } from "@/actions/requests"
import { useSnapshot } from "valtio"
import { useCompanyStore } from "@/stores/company"
import { useUserStore } from "@/stores/user"
import { toast } from "sonner"

const getRoleBadgeClass = (role: string) => {
  if (role === "Admin") return "bg-blue-100 text-blue-800 border-blue-200"
  return "bg-purple-100 text-purple-800 border-purple-200"
}

export function UsersContent() {
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const company = useSnapshot(useCompanyStore)
  const { all_users, user } = useSnapshot(useUserStore)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<"ADMIN" | "RH">()
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const closeModal = useRef<HTMLButtonElement>(null)

  const filteredUsers = all_users?.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === "all" || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  useEffect(() => {
    if (!all_users?.length) {
      getAllUsers(company.company_selected?.id || '')
    }
  }, [company.company_selected?.id])

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    try {
      await createUser({
        name,
        email,
        password,
        role: role || "RH",
        companyId: company.company_selected?.id || ''
      })

      toast.success("Usuário criado com sucesso!")
      setName("")
      setEmail("")
      setPassword("")
      setRole("" as "ADMIN" | "RH")
      setOpen(false)
    } catch (error: any) {
      console.error("Error creating user:", error)
      toast.error(error.response.data.error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    setLoading(true)
    try {
      await deleteUser({
        user_id: userId,
        company_id: company.company_selected?.id || ''
      })
      toast.success("Usuário removido com sucesso!")
    } catch (error: any) {
      console.error("Error deleting user:", error)
      toast.error(error.response?.data?.error || "Erro ao remover usuário")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateUser = async (id: string) => {
    setLoading(true)
    try {
      await updateUser({
        user_id: id,
        companyId: company.company_selected?.id || '',
        password: newPassword,
        current_password: currentPassword,
        name,
        role,
        email
      })
      toast.success("Usuário atualizado com sucesso!")

      closeModal.current?.click()
    } catch (error: any) {
      console.log(error)
      toast.error(error.response?.data?.error || "Erro ao atualizar usuário")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">Usuários e funções</h1>
          <p className="text-muted-foreground mt-1">Gerencie os usuários que tem acesso a sua compania</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => {
          if (loading) return
          setOpen(v)
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="w-4 h-4" />
              Criar usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar usuário</DialogTitle>
              <DialogDescription>Dê ao usuário uma função e crie seu acesso</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inviteName">Nome do usuário</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} id="inviteName" type="text" placeholder="Nome completo do usuário" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inviteEmail">Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} id="inviteEmail" type="email" placeholder="user@company.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invitePassword">Senha</Label>
                <Input value={password} onChange={(e) => setPassword(e.target.value)} id="invitePassword" type="text" placeholder="Digite a senha do usuário" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inviteRole">Função</Label>
                <Select defaultValue="HR" value={role} onValueChange={(value) => setRole(value as "ADMIN" | "RH")}>
                  <SelectTrigger id="inviteRole" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="RH">RH</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Admins tem acesso completo, RH pode gerenciar funcionários</p>
              </div>
              <div className="flex justify-end gap-3">
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancelar
                  </Button>
                </DialogClose>
                <Button disabled={!name || !email || !password || !role || loading} type="submit" className="cursor-pointer">
                  Criar usuário
                  {loading && <Loader2 className="animate-spin" />}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar usuários por nome ou email..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as funções</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="RH">RH</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredUsers?.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Sem usuários encontrados</p>
            </CardContent>
          </Card>
        ) : (
          filteredUsers?.map((user_list) => (
            <Card key={user_list.id} className="p-0">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 w-full">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-primary text-primary-foreground">{user_list.name.split('')[0]}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1 w-full">
                      <div className="w-full flex justify-between items-center">
                        <p className="font-medium">{user_list.name}</p>
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeClass(user_list.role)}`}
                          >
                            {user_list.role}
                          </span>
                          {user_list.id === user?.id && (
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border bg-amber-400/30 font-medium border-amber-500/70 text-amber-700`}
                            >
                              VOCÊ
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{user_list.email}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1 bg-transparent cursor-pointer">
                        Editar
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Editar usuário</DialogTitle>
                      </DialogHeader>

                      <section className="space-y-2">
                        <Input value={name.length === 0 ? user_list.name : name} onChange={(e) => setName(e.target.value)} />
                        <Input value={email.length === 0 ? user_list.email : email} onChange={(e) => setEmail(e.target.value)} />
                        <Select value={role || user_list.role} onValueChange={(value) => setRole(value as any)}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                            <SelectItem value="RH">RH</SelectItem>
                          </SelectContent>
                        </Select>

                        <div className="flex items-center mt-5 gap-1">
                          <Input type={showCurrentPassword ? "text" : "password"} placeholder="senha atual" />
                          <Button onClick={() => setShowCurrentPassword(!showCurrentPassword)} size={'icon'} variant={'outline'} className="cursor-pointer">
                            {showCurrentPassword ? <EyeOff /> : <Eye />}
                          </Button>
                        </div>
                        <div className="flex items-center gap-1">
                          <Input type={showNewPassword ? "text" : "password"} placeholder="nova senha" />
                          <Button onClick={() => setShowNewPassword(!showNewPassword)} size={'icon'} variant={'outline'} className="cursor-pointer">
                            {showNewPassword ? <EyeOff /> : <Eye />}
                          </Button>
                        </div>

                        <Button disabled={loading} onClick={() => handleUpdateUser(user_list.id)} className="mt-4 w-full cursor-pointer">
                          Salvar dados
                          {loading && <Loader2 className="animate-spin" />}
                        </Button>
                      </section>

                      <DialogClose ref={closeModal} />
                    </DialogContent>
                  </Dialog>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1 text-destructive bg-transparent cursor-pointer">
                        Remover
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Remover usuário</DialogTitle>
                        <DialogDescription>Tem certeza que deseja remover o acesso desse usuário? Ele não poderá mais acessar a plataforma.</DialogDescription>
                      </DialogHeader>

                      <section className="flex items-center gap-3">
                        <DialogClose asChild>
                          <Button variant="outline" className="flex-1 cursor-pointer">Cancelar</Button>
                        </DialogClose>
                        <Button disabled={loading} onClick={() => handleDeleteUser(user_list.id)} variant="destructive" className="flex-1 cursor-pointer">
                          Remover usuário
                          {loading && <Loader2 className="animate-spin" />}
                        </Button>
                      </section>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <h3 className="font-semibold">Permições de cada função</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeClass("Admin")}`}>
                  Admin
                </div>
                <div className="flex-1 text-sm text-muted-foreground">
                  Acesso completo a todas as funcionalidades incluindo configurações da compania, gerenciamento de usuários, gerenciamento de funcionários e todos os
                  documentos.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeClass("HR")}`}>
                  RH
                </div>
                <div className="flex-1 text-sm text-muted-foreground">
                  Pode gerenciar funcionários, contratos e documentos. Não pode modificar configurações da compania ou gerenciar usuários.
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div >
  )
}
