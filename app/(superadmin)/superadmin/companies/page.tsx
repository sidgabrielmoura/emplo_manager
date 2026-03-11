import { Suspense } from "react"
import { CompaniesContent } from "@/components/companies-content"
import { SuperAdminAppLayout } from "@/components/superadm-layout"

export default function CompaniesPage() {
  return (
    <SuperAdminAppLayout>
      <Suspense fallback={null}>
        <CompaniesContent />
      </Suspense>
    </SuperAdminAppLayout>
  )
}
