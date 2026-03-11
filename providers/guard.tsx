"use client"

import { auth, getCompanyData } from "@/actions/requests"
import { useCompanyStore } from "@/stores/company"
import { useUserStore } from "@/stores/user"
import { useRouter, usePathname } from "next/navigation"
import { ReactNode, useEffect } from "react"
import { useSnapshot } from "valtio"

export function GuardProvider({ children }: { children: ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    const { company_selected } = useSnapshot(useCompanyStore)

    useEffect(() => {
        const companyId = localStorage.getItem('company_id')
        const isSuperAdminRoute = pathname.startsWith("/superadmin")

        const checkAuth = async () => {
            try {
                if (isSuperAdminRoute) {
                    const { superAdminAuth } = await import("@/actions/requests")
                    const data = await superAdminAuth()

                    if (pathname === "/superadmin/login") {
                        router.push("/superadmin/dashboard")
                    }
                } else {
                    const data = await auth()
                    if (pathname === "/login") {
                        router.push("/")
                    }

                    if (pathname === "/") {
                        useCompanyStore.company_selected = null
                    }

                    if (!companyId && pathname !== "/" && pathname !== "/onboarding") {
                        router.push("/")
                    } else if (companyId && (companyId !== company_selected?.id)) {
                        getCompanyData(companyId)
                    }
                }
            } catch (error) {
                if (isSuperAdminRoute) {
                    if (pathname !== "/superadmin/login") {
                        router.push("/superadmin/login")
                    }
                } else {
                    router.push("/login")
                }
            }
        }

        checkAuth()

    }, [pathname])

    return <>{children}</>
}
