"use client"

import { auth, getCompanyData, resetAllCompanyStores } from "@/actions/requests"
import { useCompanyStore } from "@/stores/company"
import { useUserStore } from "@/stores/user"
import { useRouter, usePathname } from "next/navigation"
import { ReactNode, useEffect, useState, useRef } from "react"
import { useSnapshot } from "valtio"

export function GuardProvider({ children }: { children: ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    const { company_selected } = useSnapshot(useCompanyStore)
    const userStore = useSnapshot(useUserStore)
    const [isInitialAuthDone, setIsInitialAuthDone] = useState(false)
    const lastSyncedPathRef = useRef<string | null>(null)

    useEffect(() => {
        const checkInitialAuth = async () => {
            const isSuperAdminRoute = pathname.startsWith("/superadmin")
            const isPassportViewRoute = pathname.startsWith("/passport/view/")

            if (isPassportViewRoute) {
                setIsInitialAuthDone(true)
                return
            }

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
            const isPassportViewRoute = pathname.startsWith("/passport/view/")

            if (isPassportViewRoute) return

            let currentUser = userStore.user
            const companyId = localStorage.getItem('company_id')

            if (currentUser && (currentUser.role as string) === "ESPIAO" && !isLoginRoute) {
                if (lastSyncedPathRef.current !== pathname) {
                    try {
                        const res = await auth()
                        currentUser = res.user
                        lastSyncedPathRef.current = pathname
                    } catch (e) {
                        currentUser = null
                    }
                }
            }

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
                // Spies have their companyId embedded in the token — skip localStorage check
                if ((currentUser as any)?.role === "ESPIAO") {
                    const spyCompanyId = (currentUser as any).companyId
                    if (spyCompanyId && spyCompanyId !== company_selected?.id) {
                        getCompanyData(spyCompanyId)
                    }

                    if (pathname === "/") {
                        const lastPage = sessionStorage.getItem('last_spy_page') || '/dashboard'
                        router.push(lastPage)
                        return
                    } else {
                        sessionStorage.setItem('last_spy_page', pathname)
                    }

                    // SPY SUBPAGE INHERITANCE REDIRECTS
                    const permissions = (currentUser as any).permissions as Record<string, { view: boolean; edit: boolean }> || {}
                    
                    const parentPages = [
                        { key: "settings", route: "/settings" },
                        { key: "employees", route: "/employees" },
                        { key: "cost-centers", route: "/cost-centers" },
                        { key: "company-documents", route: "/company-documents" }
                    ]

                    for (const parent of parentPages) {
                        if (permissions[parent.key]?.view === false) {
                            if (parent.key === "employees" && pathname.startsWith("/employees/")) {
                                const subSegment = pathname.replace("/employees/", "")
                                if (subSegment && subSegment !== "mass-creation") {
                                    continue
                                }
                            }

                            if (pathname.startsWith(parent.route + "/") && pathname !== parent.route) {
                                router.push(parent.route)
                                return
                            }
                        }
                    }

                    // /add-employee fallback if employees is blocked
                    if (permissions["employees"]?.view === false && pathname === "/add-employee") {
                        router.push("/employees")
                        return
                    }

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

    }, [pathname, userStore.user, isInitialAuthDone])

    return <>{children}</>
}
