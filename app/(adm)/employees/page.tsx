import { Suspense } from "react"
import { EmployeesContent } from "@/components/employees-content"
import { AppLayout } from "@/components/app-layout"

export default function EmployeesPage() {
  return (
    <AppLayout>
      <Suspense fallback={null}>
        <EmployeesContent />
      </Suspense>
    </AppLayout>
  )
}
