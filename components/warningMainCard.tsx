"use client"

import { useSnapshot } from "valtio"
import { useDashboardStore } from "@/stores/dashboard"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle, ArrowRight, X } from "lucide-react"
import { getDashboardData } from "@/actions/requests"
import { cn } from "@/lib/utils"

export function WarningMainCard() {
    const { dashboard } = useSnapshot(useDashboardStore)
    const pathname = usePathname()
    const router = useRouter()
    const [isVisible, setIsVisible] = useState(false)
    const [isDismissed, setIsDismissed] = useState(false)

    const isAllowedRoute = !["/login", "/onboarding", "/forgot-password", "/"].includes(pathname)
    const isSuperadmRoute = pathname.includes("/superadmin")

    useEffect(() => {
        const companyId = localStorage.getItem('company_id')
        if (isAllowedRoute && !dashboard && companyId) {
            getDashboardData(companyId)
        }
    }, [isAllowedRoute, dashboard])

    useEffect(() => {
        if (isAllowedRoute && dashboard?.documents && dashboard.documents.pending > 0 && !isDismissed && !isSuperadmRoute) {
            setIsVisible(true)
        } else {
            setIsVisible(false)
        }
    }, [dashboard?.documents?.pending, isAllowedRoute, isDismissed, isSuperadmRoute])

    if (!isAllowedRoute || !isVisible || !dashboard?.documents?.pending) return null

    return (
        <div className={cn(
            "w-full bg-red-500/80 border-b border-white/10 shadow-lg relative overflow-hidden transition-all duration-500 ease-in-out z-20",
            isVisible ? "max-h-20 opacity-100" : "max-h-0 opacity-0"
        )}>
            <div className="absolute inset-0 bg-white/5 backdrop-blur-[2px] pointer-events-none" />

            <div className="w-full mx-auto px-4 sm:px-6 py-3 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                    <div className="hidden sm:flex bg-white/20 p-2 rounded-xl border border-white/30 shadow-inner">
                        <AlertCircle className="w-5 h-5 text-white" />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                        <span className="text-white font-black text-xs sm:text-sm tracking-tight uppercase flex items-center gap-2">
                            <AlertCircle className="sm:hidden w-4 h-4 text-white" />
                            Atenção Necessária
                        </span>
                        <p className="text-amber-50 text-[10px] sm:text-xs font-bold leading-none opacity-90 truncate max-w-[200px] sm:max-w-none">
                            Você possui <span className="underline decoration-white/40 decoration-2 underline-offset-2">{dashboard?.documents.pending} documentos</span> aguardando regularização.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-4 ml-4">
                    <Button
                        onClick={() => router.push("/documents")}
                        variant="link"
                        className="h-8 sm:h-9 px-3 sm:px-4 cursor-pointer text-white hover:text-white font-black text-[10px] sm:text-xs tracking-widest uppercase gap-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all active:scale-95 whitespace-nowrap"
                    >
                        Regularizar Agora
                        <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
                    </Button>

                    <button
                        onClick={() => setIsDismissed(true)}
                        className="p-1 sm:p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                        aria-label="Fecar aviso"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}