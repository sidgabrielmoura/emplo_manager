import { Suspense } from "react"
import { MassCreationContent } from "@/components/mass-creation-content"
import { AppLayout } from "@/components/app-layout"
import { SpyPageGuard } from "@/components/spy-page-guard"

export default function MassCreationPage() {
  return (
    <AppLayout>
      <SpyPageGuard page="employees">
        <Suspense fallback={null}>
          <MassCreationContent />
        </Suspense>
      </SpyPageGuard>
    </AppLayout>
  )
}
