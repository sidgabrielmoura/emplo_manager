"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Search, Users, Loader2, MoreVertical, Pencil, Trash2, KeyRound, Building2, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { getSuperAdminUsers, updateSuperAdminUser, deleteSuperAdminUser } from "@/actions/requests"
import { SuperAdminAppLayout } from "@/components/superadm-layout"

type UserData = {
    id: string
    name: string
    email: string
    role: "ADMIN" | "RH" | "SUPERADMIN"
    createdAt: string
    company?: {
        id: string
        name: string
        imageUrl?: string
    }
}

const ROLE_LABELS: Record<string, string> = {
    ADMIN: "Admin",
    RH: "RH",
    SUPERADMIN: "SuperAdmin",
}

const ROLE_COLORS: Record<string, string> = {
    ADMIN: "bg-blue-50 text-blue-700 border-blue-200",
    RH: "bg-purple-50 text-purple-700 border-purple-200",
    SUPERADMIN: "bg-emerald-50 text-emerald-700 border-emerald-200",
}

function UserCardSkeleton() {
    return (
        <Card className="rounded-2xl border-slate-100">
            <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <Skeleton className="w-11 h-11 rounded-full shrink-0" />
                        <div className="space-y-1.5">
                            <Skeleton className="h-4 w-36" />
                            <Skeleton className="h-3 w-44" />
                        </div>
                    </div>
                    <Skeleton className="w-8 h-8 rounded-lg" />
                </div>
                <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-5 w-28" />
                </div>
            </CardContent>
        </Card>
    )
}

export default function SuperAdminUsersPage() {
    const [users, setUsers] = useState<UserData[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [companyFilter, setCompanyFilter] = useState("all")
    const [roleFilter, setRoleFilter] = useState("all")
    const [editOpen, setEditOpen] = useState(false)
    const [editUser, setEditUser] = useState<UserData | null>(null)
    const [editForm, setEditForm] = useState({ name: "", email: "", role: "" })
    const [editLoading, setEditLoading] = useState(false)

    const [pwOpen, setPwOpen] = useState(false)
    const [pwUser, setPwUser] = useState<UserData | null>(null)
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [pwLoading, setPwLoading] = useState(false)

    const [deleteOpen, setDeleteOpen] = useState(false)
    const [deleteUser, setDeleteUser] = useState<UserData | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)

    const fetchUsers = async () => {
        try {
            const data = await getSuperAdminUsers()
            setUsers(data)
        } catch (err) {
            toast.error("Erro ao carregar usuários")
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchUsers() }, [])

    const companies = Array.from(
        new Map(users.filter(u => u.company).map(u => [u.company!.id, u.company!])).values()
    )

    const filtered = users.filter((u) => {
        const q = search.toLowerCase()
        const matchSearch =
            u.name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q)
        const matchCompany = companyFilter === "all" || u.company?.id === companyFilter
        const matchRole = roleFilter === "all" || u.role === roleFilter
        return matchSearch && matchCompany && matchRole
    })

    const totalAdmins = users.filter(u => u.role === "ADMIN").length
    const totalRH = users.filter(u => u.role === "RH").length

    function openEdit(user: UserData) {
        setEditUser(user)
        setEditForm({ name: user.name, email: user.email, role: user.role })
        setEditOpen(true)
    }

    function openPw(user: UserData) {
        setPwUser(user)
        setNewPassword("")
        setConfirmPassword("")
        setPwOpen(true)
    }

    function openDelete(user: UserData) {
        setDeleteUser(user)
        setDeleteOpen(true)
    }

    async function handleEdit() {
        if (!editUser) return
        setEditLoading(true)
        try {
            await updateSuperAdminUser({
                userId: editUser.id,
                name: editForm.name,
                email: editForm.email,
                role: editForm.role,
            })
            toast.success("Usuário atualizado com sucesso!")
            setEditOpen(false)
            fetchUsers()
        } catch (err: any) {
            toast.error(err?.response?.data?.error || "Erro ao atualizar usuário")
        } finally {
            setEditLoading(false)
        }
    }

    async function handlePwChange() {
        if (!pwUser) return
        if (!newPassword || newPassword.length < 6) {
            toast.warning("A senha deve ter ao menos 6 caracteres.")
            return
        }
        if (newPassword !== confirmPassword) {
            toast.warning("As senhas não coincidem.")
            return
        }
        setPwLoading(true)
        try {
            await updateSuperAdminUser({ userId: pwUser.id, newPassword })
            toast.success("Senha atualizada com sucesso!")
            setPwOpen(false)
        } catch (err: any) {
            toast.error(err?.response?.data?.error || "Erro ao atualizar senha")
        } finally {
            setPwLoading(false)
        }
    }

    async function handleDelete() {
        if (!deleteUser) return
        setDeleteLoading(true)
        try {
            await deleteSuperAdminUser(deleteUser.id)
            toast.success("Usuário deletado.")
            setDeleteOpen(false)
            fetchUsers()
        } catch (err: any) {
            toast.error(err?.response?.data?.error || "Erro ao deletar usuário")
        } finally {
            setDeleteLoading(false)
        }
    }

    function getUserAvatar(name: string) {
        return name?.charAt(0)?.toUpperCase() || "?"
    }

    return (
        <SuperAdminAppLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">Usuários do Sistema</h1>
                    <p className="text-slate-500 mt-1">Gerencie todos os usuários cadastrados em todas as empresas.</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 lg:gap-4">
                    <Card className="rounded-2xl border-slate-100 bg-white shadow-sm">
                        <CardContent className="p-4 lg:p-5">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-slate-50 rounded-xl shrink-0">
                                    <Users className="w-5 h-5 text-slate-600" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total</p>
                                    <p className="text-2xl font-black text-slate-900">{loading ? "-" : users.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="rounded-2xl border-slate-100 bg-white shadow-sm">
                        <CardContent className="p-4 lg:p-5">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-blue-50 rounded-xl shrink-0">
                                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Admins</p>
                                    <p className="text-2xl font-black text-slate-900">{loading ? "-" : totalAdmins}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="col-span-2 sm:col-span-1 rounded-2xl border-slate-100 bg-white shadow-sm">
                        <CardContent className="p-4 lg:p-5">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-purple-50 rounded-xl shrink-0">
                                    <Users className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">RH</p>
                                    <p className="text-2xl font-black text-slate-900">{loading ? "-" : totalRH}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="rounded-2xl border-slate-100 bg-white shadow-sm">
                    <CardContent className="p-4 lg:p-5">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="Buscar por nome ou e-mail..."
                                    className="pl-10 rounded-xl border-slate-200"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <Select value={companyFilter} onValueChange={setCompanyFilter}>
                                <SelectTrigger className="w-full sm:w-52 rounded-xl border-slate-200">
                                    <Building2 className="w-4 h-4 text-slate-400 mr-2" />
                                    <SelectValue placeholder="Filtrar por empresa" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas as empresas</SelectItem>
                                    {companies.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={roleFilter} onValueChange={setRoleFilter}>
                                <SelectTrigger className="w-full sm:w-40 rounded-xl border-slate-200">
                                    <SelectValue placeholder="Função" />
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

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {loading ? (
                        Array.from({ length: 6 }).map((_, i) => <UserCardSkeleton key={i} />)
                    ) : filtered.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                            <div className="p-4 bg-slate-100 rounded-2xl mb-4">
                                <Users className="w-8 h-8 text-slate-400" />
                            </div>
                            <p className="text-slate-700 font-bold">Nenhum usuário encontrado</p>
                            <p className="text-slate-400 text-sm mt-1">Tente ajustar os filtros de busca.</p>
                        </div>
                    ) : (
                        filtered.map((user) => (
                            <Card key={user.id} className="rounded-2xl border-slate-100 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
                                <CardContent className="px-5! p-0">
                                    <div className="flex items-start justify-between gap-3 mb-4">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-11 h-11 rounded-full bg-linear-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0 text-white font-black text-lg shadow-sm">
                                                {getUserAvatar(user.name)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-900 text-sm truncate">{user.name}</p>
                                                <p className="text-xs text-slate-400 truncate">{user.email}</p>
                                            </div>
                                        </div>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48 rounded-xl">
                                                <DropdownMenuItem
                                                    className="gap-2 cursor-pointer"
                                                    onSelect={() => setTimeout(() => openEdit(user), 0)}
                                                >
                                                    <Pencil className="w-4 h-4" /> Editar dados
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="gap-2 cursor-pointer"
                                                    onSelect={() => setTimeout(() => openPw(user), 0)}
                                                >
                                                    <KeyRound className="w-4 h-4" /> Alterar senha
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="gap-2 text-red-600 focus:text-red-600 cursor-pointer"
                                                    onSelect={() => setTimeout(() => openDelete(user), 0)}
                                                >
                                                    <Trash2 className="w-4 h-4" /> Deletar usuário
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <Badge className={`text-xs font-bold border ${ROLE_COLORS[user.role] || "bg-slate-50 text-slate-700 border-slate-200"}`}>
                                            {ROLE_LABELS[user.role] || user.role}
                                        </Badge>
                                        {user.company && (
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                {user.company.imageUrl ? (
                                                    <img src={user.company.imageUrl} alt={user.company.name} className="w-4 h-4 rounded object-cover shrink-0" />
                                                ) : (
                                                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                )}
                                                <span className="text-xs text-slate-500 truncate max-w-[120px]">{user.company.name}</span>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>

            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="rounded-2xl max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Editar Usuário</DialogTitle>
                        <DialogDescription>Atualize os dados de <strong>{editUser?.name}</strong>.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="edit-name">Nome</Label>
                            <Input
                                id="edit-name"
                                value={editForm.name}
                                onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                                className="rounded-xl"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="edit-email">E-mail</Label>
                            <Input
                                id="edit-email"
                                type="email"
                                value={editForm.email}
                                onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
                                className="rounded-xl"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="edit-role">Função</Label>
                            <Select value={editForm.role} onValueChange={v => setEditForm(p => ({ ...p, role: v }))}>
                                <SelectTrigger className="rounded-xl">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                    <SelectItem value="RH">RH</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editLoading} className="rounded-xl cursor-pointer">
                            Cancelar
                        </Button>
                        <Button onClick={handleEdit} disabled={editLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer min-w-[100px]">
                            {editLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={pwOpen} onOpenChange={setPwOpen}>
                <DialogContent className="rounded-2xl max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Alterar Senha</DialogTitle>
                        <DialogDescription>Defina uma nova senha para <strong>{pwUser?.name}</strong>.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="new-pw">Nova senha</Label>
                            <Input
                                id="new-pw"
                                type="password"
                                placeholder="Mínimo 6 caracteres"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                className="rounded-xl"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="confirm-pw">Confirmar senha</Label>
                            <Input
                                id="confirm-pw"
                                type="password"
                                placeholder="Repita a senha"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                className="rounded-xl"
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setPwOpen(false)} disabled={pwLoading} className="rounded-xl cursor-pointer">
                            Cancelar
                        </Button>
                        <Button onClick={handlePwChange} disabled={pwLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer min-w-[120px]">
                            {pwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Alterar senha"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent className="rounded-2xl max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Deletar Usuário</DialogTitle>
                        <DialogDescription>
                            Tem certeza que deseja deletar <strong>{deleteUser?.name}</strong>? Esta ação é irreversível.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleteLoading} className="rounded-xl cursor-pointer">
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading} className="rounded-xl cursor-pointer min-w-[100px]">
                            {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Deletar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </SuperAdminAppLayout>
    )
}
