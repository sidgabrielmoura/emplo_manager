"use client"

import React, { useEffect } from "react"
import { useSnapshot } from "valtio"
import { useUserStore } from "@/stores/user"
import { Lock } from "lucide-react"
import { toast } from "sonner"

interface SpyPageGuardProps {
  page: string
  action?: "view" | "edit"
  children: React.ReactNode
  customBlockCondition?: boolean
  customBlockMessage?: string
  extraActions?: React.ReactNode
}

export function SpyPageGuard({
  page,
  action = "view",
  children,
  customBlockCondition,
  customBlockMessage,
  extraActions
}: SpyPageGuardProps) {
  const user = useSnapshot(useUserStore).user

  const isSpy = (user?.role as string) === "ESPIAO"
  const permissions = (user as any)?.permissions as Record<string, { view: boolean; edit: boolean }>

  const hasViewPermission = !isSpy || (permissions && permissions[page]?.view === true)
  const isBlocked = isSpy && (!hasViewPermission || customBlockCondition === true)

  useEffect(() => {
    // Log in audit log if unauthorized page is visited
    if (isBlocked) {
      // Dispatches request to log page block attempt in database
      fetch("/api/spy/logs/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "BLOCKED_ATTEMPT",
          details: `Tentativa de visualização bloqueada na página: ${page}${customBlockCondition ? " (por restrição herdada)" : ""}`
        })
      }).catch(console.error)
    }
  }, [isBlocked, page, customBlockCondition])

  if (isBlocked) {
    const pageNames: Record<string, string> = {
      "company-documents": "Documentos da Empresa",
      "employees": "Funcionários",
      "passport": "Perfil de Qualificação",
      "cost-centers": "Centros de Custo",
      "settings": "Configurações"
    }
    const displayName = pageNames[page] || page

    return (
      <div className="relative w-full min-h-[80dvh] flex items-center justify-center overflow-hidden rounded-[2.5rem]">
        {/* Blurred Content Underlay */}
        <div className="w-full h-full filter blur-md opacity-35 pointer-events-none select-none absolute inset-0">
          {children}
        </div>

        {/* Dark Semi-transparent Overlay */}
        <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[2px] transition-all duration-300" />

        {/* Glassmorphic Lock Card */}
        <div className="relative z-10 max-w-sm w-full mx-4 bg-white border border-slate-100 p-8 rounded-[2rem] shadow-xl shadow-slate-100/55 text-center flex flex-col items-center animate-scale font-sans">
          <div className="p-4 bg-purple-50 text-purple-600 rounded-2xl ring-4 ring-purple-50/50 mb-5 animate-pulse">
            <Lock className="w-8 h-8" />
          </div>

          <h3 className="text-lg font-black text-slate-800 tracking-tight mb-2">
            Acesso Restrito
          </h3>

          <p className="text-slate-500 text-xs font-semibold leading-relaxed mb-6">
            {customBlockMessage || (
              <>
                Seu perfil de acesso temporário não possui permissão de visualização para a página de <span className="text-purple-600 font-bold">{displayName}</span>.
              </>
            )}
          </p>

          {extraActions && (
            <div className="w-full mb-6">
              {extraActions}
            </div>
          )}

          <div className="w-full h-px bg-slate-100 mb-6" />

          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Escudo de segurança ETXGestão
          </p>
        </div>
      </div>
    )
  }

  // Render children normally if authorized
  return <>{children}</>
}
