import { Suspense } from "react"
import { EmployeesContent } from "@/components/employees-content"
import { AppLayout } from "@/components/app-layout"
import { SpyPageGuard } from "@/components/spy-page-guard"

export default function EmployeesPage() {
  return (
    <AppLayout>
      <SpyPageGuard page="employees">
        <Suspense fallback={null}>
          <EmployeesContent />
        </Suspense>
      </SpyPageGuard>
    </AppLayout>
  )
}
