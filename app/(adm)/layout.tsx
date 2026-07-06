import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import jwt from "jsonwebtoken"
import prisma from "@/lib/prisma"

export default async function AdmLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const spyToken = cookieStore.get("spy_access_token")?.value

  let redirectTo: string | null = null

  if (spyToken) {
    try {
      const secret = process.env.JWT_SECRET || "super_secret"
      const decoded = jwt.verify(spyToken, secret) as any

      if (decoded && decoded.role === "ESPIAO" && decoded.sessionId) {
        // Fetch spy session status in database
        const spySession = await prisma.spySession.findUnique({
          where: { id: decoded.sessionId },
          include: { spyAccess: true }
        })

        const isExpired = spySession 
          ? new Date(spySession.spyAccess.expiresAt) <= new Date() || spySession.status === "EXPIRED" 
          : true

        if (!spySession || spySession.status === "BLOCKED" || isExpired) {
          redirectTo = "/infiltracao/expirado"
        } else {
          // Check if the current page is permitted for this spy
          const headersList = await headers()
          const pathname = headersList.get("x-pathname") || ""
          const pathParts = pathname.split("/").filter(Boolean)
          const primaryKey = pathParts[0] || ""

          // Subroutes that bypass page-level blocks to allow details viewing or history check
          const isPassportHistory = pathname === "/passport/history"
          const isPassportView = pathname.startsWith("/passport/view/")
          const isEmployeeDetail = /^\/employees\/[a-f0-9-]+$/i.test(pathname)
          const isBypassed = isPassportHistory || isPassportView || isEmployeeDetail

          if (!isBypassed && primaryKey) {
            let pageKey = primaryKey
            if (primaryKey === "add-employee") {
              pageKey = "employees"
            }

            const permissions = (spySession.spyAccess.permissions as any) || {}
            const isPageAllowed = permissions[pageKey]?.view === true

            // If the page is blocked for the spy, redirect to the first allowed page
            if (!isPageAllowed) {
              const availablePages = ["dashboard", "employees", "passport", "documents", "company-documents", "cost-centers"]
              const firstAllowedPage = availablePages.find(key => permissions[key]?.view === true) || "dashboard"
              redirectTo = `/${firstAllowedPage}`
            }
          }
        }
      } else {
        redirectTo = "/infiltracao/expirado"
      }
    } catch (error) {
      console.error("Spy session server validation error:", error)
      redirectTo = "/infiltracao/expirado"
    }
  }

  if (redirectTo) {
    redirect(redirectTo)
  }

  return <>{children}</>
}
