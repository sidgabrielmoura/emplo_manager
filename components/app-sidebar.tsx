"use client"

import Link from "next/link"
import { LayoutDashboard, Users, FileText, UserCog, Settings, Book, Building2 } from "lucide-react"
import Image from "next/image"
import { usePathname } from "next/navigation"

const adminNavigation = [
  { name: "Painel", href: "/dashboard", icon: LayoutDashboard },
  { name: "Funcionários", href: "/employees", icon: Users },
  { name: "Documentos", href: "/documents", icon: FileText },
  { name: "Perfil de qualificação", href: "/passport", icon: Book },
  { name: "Usuários e Funções", href: "/users", icon: UserCog },
  { name: "Configurações", href: "/settings", icon: Settings },
]

const superAdminNavigation = [
  { name: "Dashboard Global", href: "/superadmin/dashboard", icon: LayoutDashboard },
  { name: "Gestão de Empresas", href: "/superadmin/companies", icon: Building2 },
  { name: "Usuários do Sistema", href: "/superadmin/users", icon: Users },
]

interface AppSidebarProps {
  onNavItemClick?: () => void
}

export function AppSidebar({ onNavItemClick }: AppSidebarProps) {
  const pathname = usePathname()
  const isSuperAdminView = pathname.startsWith("/superadmin")

  const navigation = isSuperAdminView ? superAdminNavigation : adminNavigation

  return (
    <aside className="w-64 h-full border-r border-slate-200 bg-white flex flex-col items-center shadow-sm">
      <div className="p-6 border-b border-slate-50 flex items-center shrink-0 w-full">
        <Image src="/ETX-GESTAO-4.png" alt="ETX GESTÃO" width={160} height={40} className="w-auto h-12" />
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto w-full">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => onNavItemClick?.()}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 group ${isActive
                ? "bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-100"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
            >
              <item.icon className={`w-5 h-5 transition-colors ${isActive ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600"
                }`} />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-slate-50 w-full">
        <div className="bg-slate-50 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Versão do Sistema</p>
          <p className="text-xs font-semibold text-slate-600">v1.0.0 - Estável</p>
        </div>
      </div>
    </aside>
  )
}
