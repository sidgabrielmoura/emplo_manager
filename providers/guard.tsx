"use client"

import { auth, getCompanyData, resetAllCompanyStores } from "@/actions/requests"
import { useCompanyStore } from "@/stores/company"
import { useUserStore } from "@/stores/user"
import { useRouter, usePathname } from "next/navigation"
import { ReactNode, useEffect, useState } from "react"
import { useSnapshot } from "valtio"

export function GuardProvider({ children }: { children: ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    const { company_selected } = useSnapshot(useCompanyStore)
    const { user } = useSnapshot(useUserStore)
    const [isInitialAuthDone, setIsInitialAuthDone] = useState(false)

    useEffect(() => {
        const isSuperAdminRoute = pathname.startsWith("/superadmin")

        const checkInitialAuth = async () => {
            try {
                if (isSuperAdminRoute) {
                    const { superAdminAuth } = await import("@/actions/requests")
                    await superAdminAuth()
                } else {
                    await auth()
                }
            } catch (error) {
                console.error("Initial auth failed:", error)
            } finally {
                setIsInitialAuthDone(true)
            }
        }

        checkInitialAuth()
    }, [])

    useEffect(() => {
        if (!isInitialAuthDone) return

        const companyId = localStorage.getItem('company_id')
        const isSuperAdminRoute = pathname.startsWith("/superadmin")

        const handleGuarding = () => {
            if (!user) {
                if (isSuperAdminRoute) {
                    if (pathname !== "/superadmin/login") router.push("/superadmin/login")
                } else {
                    if (pathname !== "/login") router.push("/login")
                }
                return
            }

            if (isSuperAdminRoute) {
                if (pathname === "/superadmin/login") router.push("/superadmin/dashboard")
            } else {
                if (pathname === "/login") {
                    router.push("/")
                    return
                }

                if (pathname === "/") {
                    resetAllCompanyStores()
                }

                if (!companyId && pathname !== "/" && pathname !== "/onboarding") {
                    router.push("/")
                } else if (companyId && (companyId !== company_selected?.id)) {
                    getCompanyData(companyId)
                }
            }
        }

        handleGuarding()

    }, [pathname, user, isInitialAuthDone])

    return <>{children}</>
}
