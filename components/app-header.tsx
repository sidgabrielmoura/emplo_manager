"use client"

import { Building2, ChevronDown, Loader2, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useSnapshot } from "valtio"
import { useCompanyStore } from "@/stores/company"
import { useUserStore } from "@/stores/user"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { logout } from "@/actions/requests"
import { usePathname } from "next/navigation"

interface AppHeaderProps {
  onMenuClick?: () => void
}

export function AppHeader({ onMenuClick }: AppHeaderProps) {
  const company = useSnapshot(useCompanyStore)
  const userStore = useSnapshot(useUserStore)
  const [loading, setLoading] = useState(false)
  const pathname = usePathname()
  const { user } = useSnapshot(useUserStore)

  const handleLogout = async () => {
    try {
      setLoading(true)
      if (userStore.user?.role === "SUPERADMIN") {
        const { superAdminLogout } = await import("@/actions/requests")
        await superAdminLogout()
      } else {
        await logout()
      }
    } catch (error) {
      toast.error("Erro ao sair da conta")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <header className="h-16 border-b border-slate-200 bg-white px-4 lg:px-6 flex items-center justify-between shadow-sm sticky top-0 z-30">
      <div className="flex items-center gap-2 lg:gap-6">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden text-slate-500"
          onClick={onMenuClick}
        >
          <Menu className="w-6 h-6" />
        </Button>

        <div className="flex items-center gap-2 max-w-[150px] sm:max-w-none">
          <div className="size-8 shrink-0 rounded-lg border border-slate-100 shadow-sm overflow-hidden hidden sm:block">
            {!pathname.startsWith("/superadmin") && company.company_selected ? (
              <img src={company.company_selected?.imageUrl || ""} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-emerald-100 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-emerald-600" />
              </div>
            )}
          </div>
          <span className="text-lg lg:text-xl font-bold text-slate-900 truncate">
            {!pathname.startsWith("/superadmin") && company.company_selected ? company.company_selected?.name : "SuperAdmin"}
          </span>
        </div>

        <div className="hidden sm:block h-6 w-px bg-slate-200"></div>

        {!pathname.startsWith('/superadmin') ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="hidden sm:flex gap-2 bg-transparent h-9 border-slate-200 hover:bg-slate-50 transition-colors">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span className="max-w-[100px] truncate">{company.company_selected?.name}</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 rounded-xl shadow-lg border-slate-100">
              <Link href={'/'}>
                <DropdownMenuItem className="cursor-pointer">Trocar Empresa</DropdownMenuItem>
                {user?.role === "SUPERADMIN" && <Link href="/superadmin/dashboard"><DropdownMenuItem className="cursor-pointer font-extrabold text-green-600 hover:text-green-600/80! hover:bg-green-600/10!">Área Superadmin</DropdownMenuItem></Link>}
              </Link>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link href="/">
            <Button variant="outline" className="hidden sm:flex gap-2 bg-transparent h-9 border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">Área Administrativa</Button>
          </Link>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2 h-9 hover:bg-slate-50 transition-colors p-1 sm:px-3">
            <Avatar className="w-8 h-8 ring-2 ring-primary/10">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">{userStore.user?.name.split('')[0]}</AvatarFallback>
            </Avatar>
            <span className="hidden md:inline text-sm font-semibold text-slate-700">{userStore.user?.name}</span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-lg border-slate-100">
          <DropdownMenuLabel className="font-bold text-slate-900">Minha Conta</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={loading} onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 font-medium">
            Sair da Conta
            {loading && <Loader2 className="ml-auto w-4 h-4 animate-spin" />}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
