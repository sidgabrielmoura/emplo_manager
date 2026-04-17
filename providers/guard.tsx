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
    const userStore = useSnapshot(useUserStore)
    const [isInitialAuthDone, setIsInitialAuthDone] = useState(false)

    useEffect(() => {
        const checkInitialAuth = async () => {
            const isSuperAdminRoute = pathname.startsWith("/superadmin")
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

        const handleGuarding = async () => {
            const isSuperAdminRoute = pathname.startsWith("/superadmin")
            const isLoginRoute = pathname === "/login" || pathname === "/superadmin/login"

            let currentUser = userStore.user
            const companyId = localStorage.getItem('company_id')

            if (!currentUser && !isLoginRoute) {
                try {
                    if (isSuperAdminRoute) {
                        const { superAdminAuth } = await import("@/actions/requests")
                        const res = await superAdminAuth()
                        currentUser = res.user
                    } else {
                        const res = await auth()
                        currentUser = res.user
                    }
                } catch (e) {
                    currentUser = null
                }
            }

            if (!currentUser) {
                if (!isLoginRoute) {
                    router.push(isSuperAdminRoute ? "/superadmin/login" : "/login")
                }
                return
            }

            if (isLoginRoute) {
                router.push(isSuperAdminRoute ? "/superadmin/dashboard" : "/")
                return
            }

            if (!isSuperAdminRoute) {
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

    }, [pathname, userStore.user, isInitialAuthDone])

    return <>{children}</>
}
